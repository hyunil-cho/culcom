'use client';

import { useEffect, useState } from 'react';
import { memberApi, type MemberMembershipResponse } from '@/lib/api';

export default function MembershipInfoModal({
  memberSeq, memberName, onClose,
}: {
  memberSeq: number;
  memberName: string;
  onClose: () => void;
}) {
  const [memberships, setMemberships] = useState<MemberMembershipResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    memberApi.getMemberships(memberSeq).then(res => {
      if (res.success) setMemberships(res.data);
      setLoading(false);
    });
  }, [memberSeq]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 12, width: '90%', maxWidth: 560, maxHeight: '80vh', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '1rem 1.5rem', background: '#6366f1', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{memberName} - 멤버십 정보 ({memberships.length}건)</h3>
        </div>
        <div style={{ padding: '12px 16px', overflowY: 'auto', maxHeight: '60vh' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>불러오는 중...</div>
          ) : memberships.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>활성 멤버십이 없습니다.</div>
          ) : memberships.map(ms => {
            const rem = ms.totalCount - ms.usedCount;
            const pctUsed = ms.totalCount > 0 ? Math.round(ms.usedCount / ms.totalCount * 100) : 0;
            return (
              <div key={ms.seq} style={{ border: '1.5px solid #e0e7ff', borderRadius: 10, padding: 16, marginBottom: 12, background: '#fafaff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: '#4338ca' }}>{ms.membershipName}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '2px 10px', borderRadius: 12 }}>{ms.status}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                  <div><span style={{ color: '#888' }}>기간</span><br /><strong>{ms.startDate} ~ {ms.expiryDate}</strong></div>
                  <div><span style={{ color: '#888' }}>수업 횟수</span><br /><strong style={{ color: '#4a90e2' }}>{ms.usedCount}회 사용 / {ms.totalCount}회 (잔여 {rem}회)</strong></div>
                  <div><span style={{ color: '#888' }}>결제 금액</span><br /><strong>{ms.price || '-'}</strong></div>
                  <div><span style={{ color: '#888' }}>연기</span><br /><strong>{ms.postponeUsed}회 사용 / {ms.postponeTotal}회</strong></div>
                </div>
                <div style={{ marginTop: 10, background: '#e5e7eb', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${pctUsed}%`, height: '100%', background: '#6366f1', borderRadius: 6 }} />
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#888', marginTop: 4 }}>수업 진행률 {pctUsed}%</div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', border: '1px solid #ccc', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>닫기</button>
        </div>
      </div>
    </div>
  );
}
