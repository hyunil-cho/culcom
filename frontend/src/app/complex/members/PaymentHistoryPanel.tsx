'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  memberApi,
  type MemberMembershipResponse,
  type MembershipPaymentResponse,
} from '@/lib/api';
import { usePaymentOptions } from '@/lib/usePaymentOptions';
import PaymentAddModal from './outstanding/PaymentAddModal';

const STATUS_COLOR: Record<string, { bg: string; fg: string; border: string }> = {
  '미정': { bg: '#f1f3f5', fg: '#666', border: '#dee2e6' },
  '미납': { bg: '#fff5f5', fg: '#e03131', border: '#ffc9c9' },
  '부분납부': { bg: '#fffbeb', fg: '#d97706', border: '#fde68a' },
  '완납': { bg: '#f0fdf4', fg: '#2e7d32', border: '#bbf7d0' },
  '초과': { bg: '#eff6ff', fg: '#2563eb', border: '#bfdbfe' },
};

interface Props {
  memberSeq: number;
  memberName: string;
}

export default function PaymentHistoryPanel({ memberSeq, memberName }: Props) {
  const { methods, kinds } = usePaymentOptions();
  const methodLabel = (v: string | null) => methods.find(m => m.value === v)?.label ?? v ?? '-';
  const kindLabel = (v: string) => kinds.find(k => k.value === v)?.label ?? v;

  const [memberships, setMemberships] = useState<MemberMembershipResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState<MemberMembershipResponse | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    memberApi.getMemberships(memberSeq)
      .then(res => setMemberships(res.data))
      .finally(() => setLoading(false));
  }, [memberSeq]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>불러오는 중…</div>;
  if (memberships.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>등록된 멤버십이 없습니다.</div>;
  }

  return (
    <>
      {memberships.map(mm => {
        const status = STATUS_COLOR[mm.paymentStatus] ?? STATUS_COLOR['미정'];
        const sortedPayments = [...(mm.payments ?? [])].sort(
          (a, b) => a.paidDate.localeCompare(b.paidDate),
        );

        return (
          <section
            key={mm.seq}
            style={{
              border: '1px solid #e6ecf2',
              borderRadius: 8,
              marginBottom: 16,
              overflow: 'hidden',
            }}
          >
            {/* 멤버십 헤더 */}
            <div style={{
              padding: '14px 16px',
              background: '#f8fafc',
              borderBottom: '1px solid #e6ecf2',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <strong style={{ fontSize: 15 }}>{mm.membershipName}</strong>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    background: status.bg,
                    color: status.fg,
                    border: `1px solid ${status.border}`,
                  }}>
                    {mm.paymentStatus}
                  </span>
                  {!mm.isActive && (
                    <span style={{ fontSize: 11, color: '#999' }}>(비활성)</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {mm.startDate} ~ {mm.expiryDate}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                <Stat label="총액" value={mm.price ? `${Number(mm.price.replace(/[^0-9-]/g, '')).toLocaleString()}원` : '-'} />
                <Stat label="납부합계" value={`${mm.paidAmount.toLocaleString()}원`} color="#2e7d32" />
                <Stat
                  label="미수금"
                  value={mm.outstanding != null ? `${mm.outstanding.toLocaleString()}원` : '-'}
                  color={mm.outstanding && mm.outstanding > 0 ? '#e03131' : '#666'}
                />
                <button
                  onClick={() => setPaymentModal(mm)}
                  style={{
                    background: '#4a90e2', color: '#fff', border: 'none',
                    borderRadius: 6, padding: '8px 14px', fontWeight: 600,
                    fontSize: 13, cursor: 'pointer',
                  }}
                >
                  + 납부 / 환불정정
                </button>
              </div>
            </div>

            {/* 결제 타임라인 */}
            <div>
              {sortedPayments.length === 0 ? (
                <div style={{ padding: 24, color: '#999', textAlign: 'center', fontSize: 13 }}>
                  결제 내역이 없습니다.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#fafbfc', color: '#888', fontSize: 12 }}>
                      <th style={th}>일시</th>
                      <th style={th}>구분</th>
                      <th style={{ ...th, textAlign: 'right' }}>금액</th>
                      <th style={th}>결제수단</th>
                      <th style={th}>메모</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPayments.map(p => (
                      <PaymentRow key={p.seq} payment={p}
                        kindLabel={kindLabel(p.kind)} methodLabel={methodLabel(p.method)} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        );
      })}

      {paymentModal && (
        <PaymentAddModal
          memberSeq={memberSeq}
          memberName={memberName}
          mmSeq={paymentModal.seq}
          membershipName={paymentModal.membershipName}
          outstanding={paymentModal.outstanding ?? 0}
          onClose={() => setPaymentModal(null)}
          onSaved={() => { setPaymentModal(null); load(); }}
        />
      )}
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 11, color: '#888' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color ?? '#333' }}>{value}</div>
    </div>
  );
}

function PaymentRow({ payment, kindLabel, methodLabel }: {
  payment: MembershipPaymentResponse;
  kindLabel: string;
  methodLabel: string;
}) {
  const isRefund = payment.kind === 'REFUND' || payment.amount < 0;
  return (
    <tr style={{ borderTop: '1px solid #f1f3f5' }}>
      <td style={td}>
        <span style={{ fontFamily: 'monospace', color: '#666' }}>
          {payment.paidDate.replace('T', ' ').slice(0, 16)}
        </span>
      </td>
      <td style={td}>
        <span style={{
          padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
          background: isRefund ? '#fff5f5' : '#eff6ff',
          color: isRefund ? '#e03131' : '#2563eb',
        }}>
          {kindLabel}
        </span>
      </td>
      <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: isRefund ? '#e03131' : '#2e7d32' }}>
        {payment.amount.toLocaleString()}원
      </td>
      <td style={td}>{methodLabel}</td>
      <td style={{ ...td, color: '#666' }}>{payment.note || '-'}</td>
    </tr>
  );
}

const th: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', fontWeight: 600 };
const td: React.CSSProperties = { padding: '10px 12px' };
