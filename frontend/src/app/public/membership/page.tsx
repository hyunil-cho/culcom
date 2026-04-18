'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { publicMembershipApi, type MembershipCheckMember } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { isLinkExpired, INVALID_LINK_MESSAGE } from '@/lib/linkExpiry';

export default function PublicMembershipPage() {
  return <Suspense fallback={null}><PublicMembershipPageInner /></Suspense>;
}

function PublicMembershipPageInner() {
  const searchParams = useSearchParams();

  const decoded = (() => {
    try {
      const d = searchParams.get('d');
      if (!d) return null;
      return JSON.parse(decodeURIComponent(atob(d))) as { memberSeq: number; name: string; phone: string; t?: number };
    } catch { return null; }
  })();

  const expired = !!decoded && isLinkExpired(decoded.t);

  const { data: checkResult, isLoading: loading, error: queryError } = useApiQuery(
    ['publicMembership', decoded?.name, decoded?.phone],
    () => publicMembershipApi.check(decoded!.name, decoded!.phone),
    { enabled: !!decoded && !expired },
  );

  const member: MembershipCheckMember | null = checkResult?.member ?? null;

  const error = !decoded ? INVALID_LINK_MESSAGE
    : expired ? INVALID_LINK_MESSAGE
    : queryError ? '회원 정보를 찾을 수 없습니다. 관리자에게 문의해주세요.'
    : (!loading && !member) ? '회원 정보를 찾을 수 없습니다. 관리자에게 문의해주세요.'
    : '';

  return (
    <div style={{ backgroundColor: '#f4f7f6', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', padding: 20 }}>
      <div style={{ background: 'white', padding: 40, borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '100%', maxWidth: 580, marginTop: 30 }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h1 style={{ color: '#4a90e2', fontSize: '1.8rem', marginBottom: 10 }}>멤버십 현황</h1>
          <p style={{ color: '#666', fontSize: '0.95rem' }}>회원님의 멤버십 현황입니다.</p>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>회원 정보를 확인하는 중...</div>}

        {error && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: '#dc2626', fontSize: '1rem', marginBottom: 10 }}>{error}</p>
          </div>
        )}

        {member && (
          <div>
            <div style={{ background: '#e0f2fe', border: '1.5px solid #93c5fd', borderRadius: 10, padding: 15, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 10px', color: '#1e40af', fontSize: '1rem' }}>회원 정보</h3>
              <InfoRow label="이름" value={member.name} />
              <InfoRow label="연락처" value={member.phoneNumber} />
              <InfoRow label="소속지점" value={member.branchName} />
              {member.level && <InfoRow label="레벨" value={member.level} />}
            </div>

            {member.memberships.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#999', border: '1px dashed #ddd', borderRadius: 8 }}>
                활성 멤버십이 없습니다.
              </div>
            ) : (
              member.memberships.map((ms, i) => {
                const remaining = ms.totalCount - ms.usedCount;
                const pctUsed = ms.totalCount > 0 ? Math.round(ms.usedCount / ms.totalCount * 100) : 0;
                const isPostponed = ms.status === '연기';
                return (
                  <div key={i} style={{ border: `1.5px solid ${isPostponed ? '#fde68a' : '#e0e7ff'}`, borderRadius: 10, padding: 16, marginBottom: 12, background: isPostponed ? '#fffbeb' : '#fafaff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: '#4338ca' }}>{ms.membershipName}</span>
                      <span style={{
                        fontSize: '0.78rem', fontWeight: 600, padding: '2px 10px', borderRadius: 12,
                        color: isPostponed ? '#92400e' : '#16a34a',
                        background: isPostponed ? '#fef3c7' : '#dcfce7',
                      }}>{ms.status}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.85rem' }}>
                      <div><span style={{ color: '#888' }}>기간</span><br /><strong>{ms.startDate} ~ {ms.expiryDate}</strong></div>
                      <div><span style={{ color: '#888' }}>수업 횟수</span><br /><strong style={{ color: '#4a90e2' }}>{ms.usedCount}회 사용 / {ms.totalCount}회 (잔여 {remaining}회)</strong></div>
                      <div><span style={{ color: '#888' }}>연기</span><br /><strong>{ms.postponeUsed}회 사용 / {ms.postponeTotal}회</strong></div>
                      <div><span style={{ color: '#888' }}>출석률</span><br /><strong style={{ color: ms.attendanceRate >= 80 ? '#16a34a' : ms.attendanceRate >= 50 ? '#d97706' : '#dc2626' }}>{ms.attendanceRate}%</strong> ({ms.presentCount}/{ms.totalAttendance})</div>
                    </div>
                    <div style={{ marginTop: 10, background: '#e5e7eb', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${pctUsed}%`, height: '100%', background: isPostponed ? '#f59e0b' : '#6366f1', borderRadius: 6 }} />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#888', marginTop: 4 }}>수업 진행률 {pctUsed}%</div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: '0.9rem' }}>
      <span style={{ color: '#555', fontWeight: 600, minWidth: 70 }}>{label}</span>
      <span style={{ color: '#333' }}>{value}</span>
    </div>
  );
}
