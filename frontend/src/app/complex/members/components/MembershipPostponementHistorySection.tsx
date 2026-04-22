'use client';

import { postponementApi, type PostponementRequest } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';

interface Props {
  memberSeq: number;
}

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  '대기': { bg: '#eef2ff', color: '#4f46e5' },
  '승인': { bg: '#ecfdf5', color: '#065f46' },
  '반려': { bg: '#fef2f2', color: '#991b1b' },
};

export default function MembershipPostponementHistorySection({ memberSeq }: Props) {
  const { data: history = [], isLoading } = useApiQuery<PostponementRequest[]>(
    ['postponementHistory', memberSeq],
    () => postponementApi.memberHistory(memberSeq),
  );

  // 연기 기록이 0건이면 섹션 자체를 숨긴다.
  if (!isLoading && history.length === 0) return null;

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: '1rem 1.25rem',
      marginTop: '1rem',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #f1f5f9',
      }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#334155' }}>
          연기 요청 기록
          {!isLoading && (
            <span style={{ marginLeft: 8, fontSize: '0.78rem', color: '#94a3b8', fontWeight: 400 }}>
              ({history.length}건)
            </span>
          )}
        </h3>
      </div>

      {isLoading ? (
        <div style={{ padding: '1rem 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
          불러오는 중...
        </div>
      ) : history.length === 0 ? (
        <div style={{ padding: '1rem 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
          연기 요청 기록이 없습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {history.map((h) => {
            const badge = STATUS_BADGE[h.status] ?? STATUS_BADGE['대기'];
            return (
              <div key={h.seq} style={{
                border: '1px solid #f1f5f9', borderRadius: 6, padding: '10px 12px',
                background: '#fafbfc',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700,
                      background: badge.bg, color: badge.color,
                    }}>
                      {h.status}
                    </span>
                    {h.membershipName && (
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600,
                        background: '#f1f5f9', color: '#475569',
                      }}>
                        {h.membershipName}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    요청: {h.createdDate?.split('T')[0] ?? '-'}
                  </span>
                </div>
                {h.startDate && h.endDate && (
                  <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600, marginBottom: 2 }}>
                    {h.startDate} ~ {h.endDate}
                  </div>
                )}
                {h.reason && (
                  <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: 2 }}>
                    사유: {h.reason}
                  </div>
                )}
                {h.desiredClassName && (
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 2 }}>
                    희망 복귀 수업: <strong>{h.desiredClassName}</strong>
                    {h.desiredTimeSlotName && (
                      <span style={{ marginLeft: 4 }}>
                        · {h.desiredTimeSlotName}
                        {h.desiredStartTime && h.desiredEndTime && ` (${h.desiredStartTime}~${h.desiredEndTime})`}
                      </span>
                    )}
                  </div>
                )}
                {h.adminMessage && (
                  <div style={{
                    fontSize: '0.78rem', marginTop: 4, padding: '6px 8px', borderRadius: 4,
                    background: h.status === '반려' ? '#fef2f2' : '#f0fdf4',
                    color: h.status === '반려' ? '#991b1b' : '#166534',
                  }}>
                    {h.status === '반려' ? '반려 사유' : '관리자 메시지'}: {h.adminMessage}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
