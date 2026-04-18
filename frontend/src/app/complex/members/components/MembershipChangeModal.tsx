'use client';

import { useEffect, useMemo, useState } from 'react';
import { memberApi, membershipApi, type MemberMembershipResponse, type Membership } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { usePaymentOptions } from '@/lib/usePaymentOptions';
import ModalOverlay from '@/components/ui/ModalOverlay';
import FormField from '@/components/ui/FormField';
import { Input, Textarea } from '@/components/ui/FormInput';
import FormErrorBanner from '@/components/ui/FormErrorBanner';
import CardPaymentFields, { createEmptyCardDetail, type CardPaymentDetailData } from './CardPaymentFields';
import { nowDateTimeLocal } from '../memberFormTypes';
import { useSubmitLock } from '@/hooks/useSubmitLock';

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
  const { methods } = usePaymentOptions();
  const { data: products = [] } = useApiQuery<Membership[]>(['memberships'], () => membershipApi.list());

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

  // 상품 선택 시 가격/만료일 자동 채우기
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

  const handleSubmit = () => run(async () => {
    if (!newMembershipSeq) {
      setError('변경할 멤버십을 선택해 주세요.');
      return;
    }
    if (!Number.isFinite(Number(changeFee))) {
      setError('추가 비용을 숫자로 입력해 주세요.');
      return;
    }
    if (paymentMethod === '카드' && changeFee !== '0') {
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
      cardDetail: paymentMethod === '카드' ? cardDetail : undefined,
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
    <ModalOverlay onClose={onClose}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '2px solid #6366f1',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#312e81' }}>멤버십 변경</h3>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#6b7280',
        }}>×</button>
      </div>

      <div style={{ padding: '1.25rem 1.5rem', maxHeight: '70vh', overflowY: 'auto', minWidth: 480 }}>
        <FormErrorBanner error={error} />

        {/* 현재 멤버십 요약 */}
        <div data-testid="current-mm-summary" style={{
          background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8,
          padding: 12, marginBottom: 12,
        }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 700, marginBottom: 6 }}>
            현재 멤버십
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: '0.85rem' }}>
            <div><strong>{current.membershipName}</strong></div>
            <div style={{ textAlign: 'right' }}>{current.price ?? '-'}원</div>
            <div style={{ color: '#6b7280' }}>{current.startDate} ~ {current.expiryDate}</div>
            <div style={{ textAlign: 'right', color: '#6b7280' }}>
              {current.usedCount} / {current.totalCount}회 (잔여 {remaining}회)
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '1.2rem', color: '#9ca3af', margin: '6px 0' }}>↓</div>

        {/* 신규 멤버십 선택 */}
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="시작일">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </FormField>
          <FormField label="만료일">
            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </FormField>
        </div>

        <FormField label="신규 멤버십 가격">
          <Input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="원 단위"
          />
        </FormField>

        {/* 추가 비용 + 자동 계산 */}
        <FormField label="추가 비용 (음수 가능)" required>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              type="text"
              value={changeFee}
              onChange={(e) => setChangeFee(e.target.value.replace(/[^\d-]/g, ''))}
              placeholder="예: 50000 또는 -30000"
              aria-label="추가 비용"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={handleAutoCalculate}
              style={{
                padding: '0 14px', background: '#eef2ff', border: '1px solid #c7d2fe',
                borderRadius: 6, color: '#4338ca', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              자동 계산
            </button>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 4 }}>
            공식: 신규 가격 − 현재 가격 × (잔여 횟수 / 전체 횟수). 결과값은 관리자가 자유롭게 수정 가능합니다.
          </div>
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
        </div>

        {paymentMethod === '카드' && changeFee !== '0' && (
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

        <div style={{
          padding: '10px 12px', background: '#fef2f2', border: '1.5px solid #fecaca',
          borderRadius: 6, color: '#991b1b', fontSize: '0.82rem', marginTop: 8,
        }}>
          <strong>⚠️ 변경은 되돌릴 수 없습니다.</strong>
          <br />원본 멤버십은 &quot;변경&quot; 상태로 종결되고 새 멤버십이 활성화됩니다. 수업 배정은 유지됩니다.
        </div>
      </div>

      <div style={{ padding: '0.9rem 1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
        <button onClick={onClose} disabled={submitting} style={{
          flex: 1, padding: '0.7rem', border: '1px solid #d1d5db',
          background: '#fff', color: '#6b7280', borderRadius: 6, cursor: 'pointer', fontSize: '0.92rem',
        }}>취소</button>
        <button onClick={handleSubmit} disabled={submitting} style={{
          flex: 1, padding: '0.7rem', border: 'none',
          background: '#6366f1', color: '#fff', borderRadius: 6, cursor: 'pointer',
          fontSize: '0.92rem', fontWeight: 700,
        }}>
          {submitting ? '처리 중...' : '변경 확정'}
        </button>
      </div>
    </ModalOverlay>
  );
}
