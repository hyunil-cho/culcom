'use client';

import type { Membership } from '@/lib/api';
import type { MembershipStatus } from '@/lib/api/complex';

const STATUS_COLORS: Record<string, string> = {
  '환불': '#dc2626', '만료': '#dc2626', '정지': '#b45309',
};

export default function MembershipProductSummary({
  membership, status,
}: {
  membership: Membership;
  status: MembershipStatus;
}) {
  const color = STATUS_COLORS[status] ?? '#16a34a';

  return (
    <div style={{
      margin: '0 0 1rem', padding: '0.9rem 1rem',
      background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: 8,
    }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4a90e2', marginBottom: 8 }}>
        멤버십 정보
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: '0.85rem', color: '#495057' }}>
        <div><strong>등급:</strong> {membership.name}</div>
        <div><strong>상태:</strong> <span style={{ color, fontWeight: 700 }}>{status}</span></div>
        <div><strong>기간:</strong> {membership.duration}일</div>
        <div><strong>횟수:</strong> {membership.count}회</div>
        <div><strong>기준 금액:</strong> {membership.price.toLocaleString()}원</div>
        <div><strong>양도:</strong> <span style={{ color: membership.transferable ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{membership.transferable ? '가능' : '불가'}</span></div>
      </div>
    </div>
  );
}
