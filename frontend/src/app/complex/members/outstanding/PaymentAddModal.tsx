'use client';

import { useState } from 'react';
import { memberApi, type PaymentKind, type PaymentMethod } from '@/lib/api';
import { usePaymentOptions } from '@/lib/usePaymentOptions';
import ModalOverlay from '@/components/ui/ModalOverlay';
import CardPaymentFields, {
  createEmptyCardDetail,
  type CardPaymentDetailData,
} from '@/app/complex/members/components/CardPaymentFields';
import { useSubmitLock } from '@/hooks/useSubmitLock';

interface Props {
  memberSeq: number;
  memberName: string;
  mmSeq: number;
  membershipName: string;
  outstanding: number;
  onClose: () => void;
  onSaved: () => void;
}

function nowLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PaymentAddModal({
  memberSeq, memberName, mmSeq, membershipName, outstanding, onClose, onSaved,
}: Props) {
  const { methods, kinds } = usePaymentOptions();
  const [kind, setKind] = useState<PaymentKind>('BALANCE');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [paidDate, setPaidDate] = useState(nowLocal());
  const [note, setNote] = useState('');
  const [cardDetail, setCardDetail] = useState<CardPaymentDetailData>(createEmptyCardDetail);
  const [error, setError] = useState<string | null>(null);
  const { submitting, run } = useSubmitLock();

  const isCard = method === '카드';

  const handleSubmit = () => run(async () => {
    setError(null);
    const raw = amount.replace(/,/g, '').trim();
    if (!raw) { setError('금액을 입력하세요'); return; }
    let n = Number(raw);
    if (Number.isNaN(n) || n === 0) { setError('금액은 0이 될 수 없습니다'); return; }
    // 환불정정은 음수로 강제
    if (kind === 'REFUND' && n > 0) n = -n;
    if (kind !== 'REFUND' && n < 0) { setError('일반 납부는 양수여야 합니다'); return; }
    if (!method) { setError('결제 수단을 선택하세요'); return; }

    if (isCard) {
      if (!cardDetail.cardCompany) { setError('카드사를 선택하세요'); return; }
      if (!/^\d{8}$/.test(cardDetail.cardNumber)) { setError('카드번호 앞 8자리를 입력하세요'); return; }
      if (!cardDetail.cardApprovalDate) { setError('승인 날짜를 입력하세요'); return; }
      if (!cardDetail.cardApprovalNumber.trim()) { setError('승인번호를 입력하세요'); return; }
    }

    try {
      await memberApi.addPayment(memberSeq, mmSeq, {
        amount: n,
        kind,
        method,
        paidDate: paidDate ? `${paidDate}:00` : undefined,
        note: note || undefined,
        cardDetail: isCard ? cardDetail : undefined,
      });
      onSaved();
    } catch (e: any) {
      setError(e?.message ?? '저장 실패');
    }
  });

  const fillOutstanding = () => {
    if (outstanding > 0) setAmount(String(outstanding));
  };

  return (
    <ModalOverlay onClose={onClose} size="md">
      <div style={{ borderBottom: '2px solid #4a90e2', padding: '14px 18px' }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>납부 기록 추가</h3>
        <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
          {memberName} · {membershipName}
        </div>
      </div>

      <div style={{ padding: 18 }}>
        <div style={{
          padding: '10px 14px', background: '#fff5f5', border: '1px solid #ffc9c9',
          borderRadius: 6, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: '#888' }}>현재 미수금</span>
          <span style={{ fontWeight: 700, color: '#e03131' }}>
            {outstanding.toLocaleString()}원
          </span>
        </div>

        <Row label="구분">
          <select value={kind} onChange={(e) => setKind(e.target.value as PaymentKind)}
            style={inputStyle}>
            {kinds.map(o => (
              <option key={o.value} value={o.value}>
                {o.value === 'REFUND' ? `${o.label} (음수)` : o.label}
              </option>
            ))}
          </select>
        </Row>

        <Row label="금액">
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              inputMode="numeric"
              placeholder={kind === 'REFUND' ? '예: 50,000 (음수로 기록)' : '예: 100,000'}
              value={amount ? Number(amount.replace(/,/g, '')).toLocaleString() : ''}
              onChange={(e) => setAmount(e.target.value.replace(/,/g, ''))}
              style={{ ...inputStyle, flex: 1 }}
            />
            {kind !== 'REFUND' && outstanding > 0 && (
              <button type="button" onClick={fillOutstanding}
                style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, background: '#f8f9fa', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>
                미수금 전액
              </button>
            )}
          </div>
        </Row>

        <Row label="결제 수단 *">
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod | '')}
            style={inputStyle} required>
            <option value="">-- 선택 --</option>
            {methods.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Row>

        {isCard && (
          <CardPaymentFields value={cardDetail} onChange={setCardDetail} />
        )}

        <Row label="납부 일시">
          <input type="datetime-local" value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)} style={inputStyle} />
        </Row>

        <Row label="메모">
          <textarea value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="선택" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
        </Row>

        {error && (
          <div style={{ color: '#e03131', fontSize: 13, marginTop: 8 }}>{error}</div>
        )}
      </div>

      <div style={{ padding: '12px 18px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn-modal btn-modal-cancel" onClick={onClose} disabled={submitting}>취소</button>
        <button
          className="btn-modal btn-modal-confirm"
          style={{ background: kind === 'REFUND' ? '#e03131' : '#4a90e2' }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? '저장 중...' : (kind === 'REFUND' ? '환불정정 기록' : '납부 기록')}
        </button>
      </div>
    </ModalOverlay>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6,
  fontFamily: 'inherit', fontSize: 14,
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <label style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>{label}</label>
      <div>{children}</div>
    </div>
  );
}
