'use client';

import { type CSSProperties } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { attendanceViewApi, AttendanceViewClass } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { ROUTES } from '@/lib/routes';
import { useHighlightSearch } from '@/lib/useHighlightSearch';
import HighlightSearchBar from '@/components/ui/HighlightSearchBar';
import { useMessageModal } from '../../hooks/useMessageModal';
import { calcHistoryRate, RateBadge } from '../components/AttendanceRateBadge';
import { AttendanceHistoryCells } from '@/hooks/useAttendanceHistoryColumn';
import { MessageButton } from '../components/MessageButton';
import Spinner from '@/components/ui/Spinner';
import '../attendance.css';

export default function AttendanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slotSeq = Number(params.slotSeq);

  const { data: classes = [], isLoading: loading } = useApiQuery<AttendanceViewClass[]>(
    ['attendanceViewDetail', slotSeq],
    () => attendanceViewApi.getDetail(slotSeq),
    { refetchOnMount: 'always' },
  );

  const today = new Date().toISOString().split('T')[0];

  const { matchedItems, currentMatchIndex, performSearch, navigateMatch } = useHighlightSearch({
    rowSelector: '.staff-table tbody tr',
    nameSelector: '.col-name',
    phoneSelector: '.col-phone',
    highlightClass: 'row-highlight',
    activeHighlightClass: 'row-active-highlight',
  });

  const msgModal = useMessageModal();

  if (loading) return <Spinner />;

  return (
    <>
      <div className="staff-view-container">
        <div className="back-nav">
          <button className="btn-back" onClick={() => router.push(ROUTES.COMPLEX_ATTENDANCE)}>
            <span>⬅</span> 통합팀 현황 관리로
          </button>
        </div>

        <div className="staff-header">
          <div className="staff-title">
            <span>🏫 상세 등록현황 (Staff)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <MessageButton onClick={() => {
                const allMembers = classes.flatMap(cls => cls.members);
                msgModal.open('상세 등록현황', allMembers);
              }} />
              <span style={{ fontSize: '0.9rem', color: '#888', fontWeight: 'normal' }}>오늘 날짜: {today}</span>
            </div>
          </div>

          <HighlightSearchBar
            onSearch={performSearch}
            matchCount={matchedItems.length}
            currentIndex={currentMatchIndex}
            onNavigate={navigateMatch}
          />
        </div>

        {classes.map(cls => {
          const rate = calcHistoryRate(cls.members);
          return (
            <div key={cls.classSeq} className="class-section" style={{ marginBottom: 40 }}>
              <h3 style={{ marginBottom: 10, color: '#4a90e2', display: 'flex', alignItems: 'center', gap: 10 }}>
                📍 {cls.name}
                <RateBadge rate={rate} />
              </h3>
              <div className="staff-table-wrapper">
                <table className="staff-table">
                  <thead>
                    <tr>
                      <th>번호</th>
                      <th>이름</th>
                      <th>레벨</th>
                      <th>연락처</th>
                      <th>특이사항</th>
                      <th>시작일</th>
                      <th>종료일</th>
                      <th>잔여횟수</th>
                      <th>멤버십</th>
                      <th colSpan={14}>최근 출석기록</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cls.members.map((m, i) => {
                      const remaining = (m.totalCount ?? 0) - (m.usedCount ?? 0);
                      const stats = m.totalCount != null ? `${m.usedCount ?? 0}회 사용 / ${Math.max(0, remaining)}회 남음` : '';

                      // 멤버십 상태 분류 (스태프 제외)
                      // - none      : 활성 멤버십 자체가 없음
                      // - exhausted : 횟수 모두 소진 (잔여 0 이하)
                      // - expired   : 종료일 지남
                      // - lowCount  : 잔여 1~3회
                      // - lowDays   : 종료일까지 7일 이하
                      // - active    : 그 외 정상
                      const today = new Date().toISOString().slice(0, 10);
                      let mState: 'none' | 'exhausted' | 'expired' | 'lowCount' | 'lowDays' | 'active' = 'active';
                      if (!m.staff) {
                        if (!m.membershipName) mState = 'none';
                        else if (m.totalCount != null && remaining <= 0) mState = 'exhausted';
                        else if (m.expiryDate && m.expiryDate < today) mState = 'expired';
                        else if (m.totalCount != null && remaining <= 3) mState = 'lowCount';
                        else if (m.expiryDate) {
                          const days = Math.ceil((new Date(m.expiryDate).getTime() - new Date(today).getTime()) / 86400000);
                          if (days <= 7) mState = 'lowDays';
                        }
                      }
                      const stateStyle: Record<string, CSSProperties> = {
                        none:      { background: '#f1f3f5', color: '#868e96' },
                        exhausted: { background: '#ffe3e3', color: '#c92a2a', fontWeight: 700 },
                        expired:   { background: '#ffe3e3', color: '#c92a2a', fontWeight: 700 },
                        lowCount:  { background: '#fff3bf', color: '#e67700', fontWeight: 600 },
                        lowDays:   { background: '#fff3bf', color: '#e67700', fontWeight: 600 },
                        active:    { background: '#d3f9d8', color: '#2b8a3e', fontWeight: 600 },
                      };
                      const stateLabel: Record<string, string> = {
                        none: '없음', exhausted: '소진', expired: '만료',
                        lowCount: '잔여 임박', lowDays: '만료 임박', active: '활성',
                      };
                      const badgeStyle: CSSProperties = m.staff
                        ? { background: '#fff4e6', color: '#e67e22' }
                        : stateStyle[mState];

                      return (
                        <tr key={`${m.memberSeq}-${i}`} style={m.staff ? { background: '#fff8f0' } : {}}>
                          <td className="col-index" style={m.staff ? { fontWeight: 800, color: '#e67e22', fontSize: '0.7rem' } : {}}>
                            {m.staff ? 'STAFF' : i}
                          </td>
                          <td className="col-name">{m.name}</td>
                          <td>{m.level || ''}</td>
                          <td className="col-phone">{m.phoneNumber}</td>
                          <td style={{ color: '#888' }}>{m.info || ''}</td>
                          <td className="col-date">{m.joinDate || ''}</td>
                          <td className="col-date" style={mState === 'expired' || mState === 'lowDays' ? { color: '#c92a2a', fontWeight: 600 } : undefined}>{m.expiryDate || ''}</td>
                          <td className="col-stats" style={mState === 'exhausted' || mState === 'lowCount' ? { color: '#c92a2a', fontWeight: 600 } : undefined}>{stats}</td>
                          <td>
                            <span style={{
                              display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                              fontSize: '0.75rem', whiteSpace: 'nowrap', ...badgeStyle,
                            }}>
                              {m.staff ? 'STAFF' : `${m.membershipName || '-'} · ${stateLabel[mState]}`}
                            </span>
                          </td>
                          <td>
                            <AttendanceHistoryCells history={m.attendanceHistory} size={14} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {classes.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>해당 시간대에 수업이 없습니다.</div>
        )}
      </div>

      {msgModal.rendered}
    </>
  );
}
