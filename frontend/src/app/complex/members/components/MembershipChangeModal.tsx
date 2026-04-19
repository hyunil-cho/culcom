'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { memberApi, membershipApi, type MemberMembershipResponse, type Membership } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { usePaymentOptions } from '@/lib/usePaymentOptions';
import { ROUTES } from '@/lib/routes';
import ModalOverlay from '@/components/ui/ModalOverlay';
import FormField from '@/components/ui/FormField';
import { Input, Textarea } from '@/components/ui/FormInput';
import FormErrorBanner from '@/components/ui/FormErrorBanner';
import CardPaymentFields, { createEmptyCardDetail, type CardPaymentDetailData } from './CardPaymentFields';
import { nowDateTimeLocal } from '../memberFormTypes';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { hasOutstanding } from '../membershipEligibility';
import s from './MembershipChangeModal.module.css';

interface Props {
  memberSeq: number;
  current: MemberMembershipResponse;
  onClose: () => void;
  onSuccess: () => void;
}

function parsePrice(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v.replace(/[^\d-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** 자동 계산 공식: 신규 가격 − 현재 가격 × (잔여 / 전체) */
function suggestedFee(current: MemberMembershipResponse, newPrice: number): number | null {
  const cur = parsePrice(current.price);
  if (cur == null || !current.totalCount || current.totalCount <= 0) return null;
  const remaining = Math.max(0, current.totalCount - current.usedCount);
  const remainingValue = Math.round(cur * remaining / current.totalCount);
  return newPrice - remainingValue;
}

export default function MembershipChangeModal({ memberSeq, current, onClose, onSuccess }: Props) {
  const router = useRouter();
  const { methods } = usePaymentOptions();
  const { data: products = [] } = useApiQuery<Membership[]>(['memberships'], () => membershipApi.list());
  const outstandingBlocked = hasOutstanding(current);

  const [newMembershipSeq, setNewMembershipSeq] = useState<string>('');
  const [price, setPrice] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [changeFee, setChangeFee] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(nowDateTimeLocal());
  const [cardDetail, setCardDetail] = useState<CardPaymentDetailData>(() => createEmptyCardDetail());
  const [changeNote, setChangeNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { submitting, run } = useSubmitLock();

  const selectedProduct = useMemo(
    () => products.find(p => p.seq === Number(newMembershipSeq)),
    [products, newMembershipSeq],
  );

  useEffect(() => {
    if (!selectedProduct) return;
    setPrice(String(selectedProduct.price));
    const d = new Date(startDate);
    d.setDate(d.getDate() + selectedProduct.duration);
    setExpiryDate(d.toISOString().split('T')[0]);
  }, [selectedProduct, startDate]);

  const handleAutoCalculate = () => {
    const newPrice = parsePrice(price);
    if (newPrice == null) {
      setError('신규 가격을 먼저 입력해 주세요.');
      return;
    }
    const fee = suggestedFee(current, newPrice);
    if (fee == null) {
      setError('현재 멤버십 가격 또는 횟수 정보가 없어 자동 계산할 수 없습니다.');
      return;
    }
    setError(null);
    setChangeFee(String(fee));
  };

  const isCardPayment = paymentMethod === '카드';
  const hasFee = changeFee !== '' && changeFee !== '0';

  const handleSubmit = () => run(async () => {
    if (outstandingBlocked) {
      setError('미수금이 남아 있어 멤버십을 변경할 수 없습니다.');
      return;
    }
    if (!newMembershipSeq) {
      setError('변경할 멤버십을 선택해 주세요.');
      return;
    }
    if (!Number.isFinite(Number(changeFee))) {
      setError('추가 비용을 숫자로 입력해 주세요.');
      return;
    }
    if (isCardPayment && hasFee) {
      if (!cardDetail.cardCompany || !cardDetail.cardNumber ||
          !cardDetail.cardApprovalDate || !cardDetail.cardApprovalNumber) {
        setError('카드 결제 상세 정보를 모두 입력해 주세요.');
        return;
      }
    }
    setError(null);
    const res = await memberApi.changeMembership(memberSeq, current.seq, {
      newMembershipSeq: Number(newMembershipSeq),
      startDate,
      expiryDate,
      price,
      changeFee: Number(changeFee),
      paymentMethod: paymentMethod || undefined,
      paymentDate,
      cardDetail: isCardPayment && hasFee ? cardDetail : undefined,
      changeNote: changeNote || undefined,
    });
    if (!res.success) {
      setError(res.message ?? '변경에 실패했습니다.');
      return;
    }
    onSuccess();
  });

  const remaining = current.totalCount - current.usedCount;

  return (
    <ModalOverlay size="md">
      <div className={s.header}>
        <h3 className={s.headerTitle}>멤버십 변경</h3>
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

            <FormField label="변경할 멤버십" required>
              <select
                className="form-input"
                value={newMembershipSeq}
                onChange={(e) => setNewMembershipSeq(e.target.value)}
                aria-label="변경할 멤버십"
              >
                <option value="">-- 선택 --</option>
                {products
                  .filter(p => p.seq !== current.membershipSeq)
                  .map(p => (
                    <option key={p.seq} value={p.seq}>
                      {p.name} ({p.count}회 / {p.price.toLocaleString()}원)
                    </option>
                  ))}
              </select>
            </FormField>

            <FormField label="시작일">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </FormField>
            <FormField label="만료일">
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </FormField>

            <FormField label="신규 멤버십 가격">
              <Input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="원 단위"
              />
            </FormField>

            <FormField label="추가 비용 (음수 가능)" required>
              <div className={s.feeRow}>
                <Input
                  type="text"
                  value={changeFee}
                  onChange={(e) => setChangeFee(e.target.value.replace(/[^\d-]/g, ''))}
                  placeholder="예: 50000 또는 -30000"
                  aria-label="추가 비용"
                />
                <button type="button" onClick={handleAutoCalculate} className={s.autoBtn}>
                  자동 계산
                </button>
              </div>
              <div className={s.feeHint}>
                공식: 신규 가격 − 현재 가격 × (잔여 횟수 / 전체 횟수). 결과값은 관리자가 자유롭게 수정 가능합니다.
              </div>
            </FormField>

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
              <strong>⚠️ 변경은 되돌릴 수 없습니다.</strong>
              <br />원본 멤버십은 &quot;변경&quot; 상태로 종결되고 새 멤버십이 활성화됩니다. 수업 배정은 유지됩니다.
            </div>
          </div>

          <div className={s.footer}>
            <button onClick={onClose} disabled={submitting} className={s.cancelBtn}>취소</button>
            <button onClick={handleSubmit} disabled={submitting} className={s.submitBtn}>
              {submitting ? '처리 중...' : '변경 확정'}
            </button>
          </div>
        </>
      )}
    </ModalOverlay>
  );
}
