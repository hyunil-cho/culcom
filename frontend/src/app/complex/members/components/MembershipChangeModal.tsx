'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { memberApi, membershipApi, type MemberMembershipResponse, type Membership } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { usePaymentOptions } from '@/lib/usePaymentOptions';
import { ROUTES } from '@/lib/routes';
import ModalOverlay from '@/components/ui/ModalOverlay';
import ConfirmModal from '@/components/ui/ConfirmModal';
import FormField from '@/components/ui/FormField';
import { Input, Textarea } from '@/components/ui/FormInput';
import FormErrorBanner from '@/components/ui/FormErrorBanner';
import CardPaymentFields, { createEmptyCardDetail, type CardPaymentDetailData } from './CardPaymentFields';
import { nowDateTimeLocal } from '../memberFormTypes';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useResultModal } from '@/hooks/useResultModal';
import { hasOutstanding } from '../membershipEligibility';
import s from './MembershipChangeModal.module.css';

interface Props {
  memberSeq: number;
  current: MemberMembershipResponse;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * 업그레이드 전용 모달.
 * 서버 정책: newProduct.price > sourceProduct.price 일 때만 허용, 차액/시작일/만료일은 서버가 자동 계산.
 * UI는 그 계산 결과를 미리 보여주기만 하고 관리자가 직접 편집할 수 없다.
 */
export default function MembershipChangeModal({ memberSeq, current, onClose, onSuccess }: Props) {
  const router = useRouter();
  const { methods } = usePaymentOptions();
  const { data: products = [] } = useApiQuery<Membership[]>(['memberships'], () => membershipApi.list());
  const outstandingBlocked = hasOutstanding(current);

  const [newMembershipSeq, setNewMembershipSeq] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(nowDateTimeLocal());
  const [cardDetail, setCardDetail] = useState<CardPaymentDetailData>(() => createEmptyCardDetail());
  const [changeNote, setChangeNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const { submitting, run } = useSubmitLock();
  // 성공 시 확인 클릭으로 onSuccess 호출 — 상위 훅이 폼을 새 멤버십으로 재로드한다.
  const { run: runResult, modal: resultModal } = useResultModal({ onConfirm: onSuccess });

  // 업그레이드 판정 기준이 되는 "원본 상품" (가격·기간)
  const currentProduct = useMemo(
    () => products.find(p => p.seq === current.membershipSeq),
    [products, current.membershipSeq],
  );

  // 드롭다운은 상위 등급(가격 더 높은 상품)만 노출
  const upgradeCandidates = useMemo(() => {
    if (!currentProduct) return [];
    return products.filter(p => p.seq !== current.membershipSeq && p.price > currentProduct.price);
  }, [products, currentProduct, current.membershipSeq]);

  const selectedProduct = useMemo(
    () => products.find(p => p.seq === Number(newMembershipSeq)),
    [products, newMembershipSeq],
  );

  // 서버 계산식과 동일한 미리보기
  const preview = useMemo(() => {
    if (!selectedProduct || !currentProduct) return null;
    const fee = selectedProduct.price - currentProduct.price;
    const extendDays = selectedProduct.duration - currentProduct.duration;
    const newExpiry = new Date(current.expiryDate);
    newExpiry.setDate(newExpiry.getDate() + extendDays);
    return {
      fee,
      extendDays,
      startDate: current.startDate,
      expiryDate: newExpiry.toISOString().split('T')[0],
    };
  }, [selectedProduct, currentProduct, current.startDate, current.expiryDate]);

  const isCardPayment = paymentMethod === '카드';

  // 1단계: 입력 검증 후 확인 모달만 띄운다. 실제 호출은 2단계에서.
  const handleSubmit = () => {
    if (outstandingBlocked) {
      setError('미수금이 남아 있어 멤버십을 변경할 수 없습니다.');
      return;
    }
    if (!newMembershipSeq) {
      setError('변경할 멤버십을 선택해 주세요.');
      return;
    }
    if (isCardPayment) {
      if (!cardDetail.cardCompany || !cardDetail.cardNumber ||
          !cardDetail.cardApprovalDate || !cardDetail.cardApprovalNumber) {
        setError('카드 결제 상세 정보를 모두 입력해 주세요.');
        return;
      }
    }
    setError(null);
    setShowConfirm(true);
  };

  // 2단계: 확인 모달에서 확정 → API 호출 → 결과 모달 표시.
  const doSubmit = () => run(async () => {
    setShowConfirm(false);
    await runResult(
      memberApi.changeMembership(memberSeq, current.seq, {
        newMembershipSeq: Number(newMembershipSeq),
        paymentMethod: paymentMethod || undefined,
        paymentDate,
        cardDetail: isCardPayment ? cardDetail : undefined,
        changeNote: changeNote || undefined,
      }),
      `'${selectedProduct?.name ?? '새 멤버십'}'(으)로 업그레이드되었습니다.`,
    );
  });

  const remaining = current.totalCount - current.usedCount;

  return (
    <ModalOverlay size="md">
      <div className={s.header}>
        <h3 className={s.headerTitle}>멤버십 업그레이드</h3>
        <button onClick={onClose} className={s.closeBtn} aria-label="닫기">×</button>
      </div>

      {outstandingBlocked ? (
        <div className={s.blockBody} data-testid="membership-change-outstanding-block">
          <div className={s.blockMsg}>
            <div className={s.blockTitle}>⚠ 미수금이 남아 있어 멤버십을 변경할 수 없습니다.</div>
            <div className={s.blockDesc}>
              현재 미수금: <strong>{(current.outstanding ?? 0).toLocaleString()}원</strong>
              <br />
              미수금 완납 후 다시 시도해 주세요.
            </div>
          </div>
          <div className={s.blockActions}>
            <button onClick={onClose} className={s.cancelBtn}>닫기</button>
            <button
              onClick={() => { onClose(); router.push(ROUTES.COMPLEX_OUTSTANDING); }}
              className={s.blockPrimaryBtn}
            >
              미수금 관리로 이동
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={s.body}>
            <FormErrorBanner error={error} />

            <div data-testid="current-mm-summary" className={s.currentBox}>
              <div className={s.currentLabel}>현재 멤버십</div>
              <div className={s.currentGrid}>
                <div><strong>{current.membershipName}</strong></div>
                <div className="right">{current.price ?? '-'}원</div>
                <div>{current.startDate} ~ {current.expiryDate}</div>
                <div className="right">
                  {current.usedCount} / {current.totalCount}회 (잔여 {remaining}회)
                </div>
              </div>
            </div>

            <div className={s.arrow}>↓</div>

            <FormField label="업그레이드할 멤버십" required>
              <select
                className="form-input"
                value={newMembershipSeq}
                onChange={(e) => setNewMembershipSeq(e.target.value)}
                aria-label="변경할 멤버십"
              >
                <option value="">-- 선택 --</option>
                {upgradeCandidates.map(p => (
                  <option key={p.seq} value={p.seq}>
                    {p.name} ({p.count}회 / {p.price.toLocaleString()}원)
                  </option>
                ))}
              </select>
              {currentProduct && upgradeCandidates.length === 0 && (
                <div className={s.feeHint}>현재 상품보다 상위 등급(가격) 상품이 없습니다.</div>
              )}
            </FormField>

            {preview && (
              <div data-testid="upgrade-preview" className={s.currentBox}>
                <div className={s.currentLabel}>업그레이드 후 정보 (자동 계산)</div>
                <div className={s.currentGrid}>
                  <div>시작일</div>
                  <div className="right">{preview.startDate}</div>
                  <div>만료일</div>
                  <div className="right">
                    {preview.expiryDate}
                    {preview.extendDays > 0 && ` (+${preview.extendDays}일)`}
                  </div>
                  <div>차액 (추가 결제)</div>
                  <div className="right"><strong>{preview.fee.toLocaleString()}원</strong></div>
                </div>
              </div>
            )}

            <FormField label="결제 방법">
              <select
                className="form-input"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                aria-label="결제 방법"
              >
                <option value="">-- 선택 --</option>
                {methods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </FormField>
            <FormField label="결제 일시">
              <Input
                type="datetime-local"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </FormField>

            {isCardPayment && (
              <CardPaymentFields value={cardDetail} onChange={setCardDetail} />
            )}

            <FormField label="변경 사유 / 메모">
              <Textarea
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                rows={3}
                placeholder="예: 더 긴 기간으로 업그레이드"
              />
            </FormField>

            <div className={s.warnBox}>
              <strong>⚠️ 업그레이드는 되돌릴 수 없습니다.</strong>
              <br />원본 멤버십은 &quot;변경&quot; 상태로 종결되고 새 멤버십이 활성화됩니다. 사용 횟수·연기 한도·결제 이력은 원본을 기준으로 이어지며 수업 배정은 유지됩니다.
            </div>
          </div>

          <div className={s.footer}>
            <button onClick={onClose} disabled={submitting} className={s.cancelBtn}>취소</button>
            <button onClick={handleSubmit} disabled={submitting} className={s.submitBtn}>
              {submitting ? '처리 중...' : '업그레이드 확정'}
            </button>
          </div>
        </>
      )}

      {showConfirm && selectedProduct && (
        <ConfirmModal
          title="멤버십 업그레이드 확인"
          confirmLabel="변경 확정"
          confirmColor="#4338ca"
          headerColor="#f59e0b"
          onCancel={() => setShowConfirm(false)}
          onConfirm={doSubmit}
        >
          <div style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>
            <div style={{ marginBottom: 10 }}>
              <strong>{current.membershipName}</strong>에서{' '}
              <strong style={{ color: '#4338ca' }}>{selectedProduct.name}</strong>(으)로 변경합니다.
            </div>
            {preview && (
              <div style={{ marginBottom: 10, color: '#4b5563' }}>
                추가 결제 차액: <strong>{preview.fee.toLocaleString()}원</strong>
                {preview.extendDays > 0 && <> · 만료일 +{preview.extendDays}일 연장</>}
              </div>
            )}
            <div style={{
              background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6,
              padding: 10, fontSize: '0.85rem', color: '#92400e',
            }}>
              ⚠️ 이 작업은 <strong>되돌릴 수 없습니다</strong>. 원본 멤버십은 &quot;변경&quot; 상태로 종결되고
              새 멤버십이 활성화됩니다. 정말 진행하시겠습니까?
            </div>
          </div>
        </ConfirmModal>
      )}

      {resultModal}
    </ModalOverlay>
  );
}