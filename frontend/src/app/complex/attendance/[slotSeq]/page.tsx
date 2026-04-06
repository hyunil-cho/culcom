'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { attendanceViewApi, AttendanceViewClass } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useHighlightSearch } from '@/lib/useHighlightSearch';
import HighlightSearchBar from '@/components/ui/HighlightSearchBar';
import { useMessageModal } from '../../hooks/useMessageModal';
import { calcHistoryRate, RateBadge } from '../components/AttendanceRateBadge';
import { MessageButton } from '../components/MessageButton';
import '../attendance.css';

export default function AttendanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slotSeq = Number(params.slotSeq);

  const [classes, setClasses] = useState<AttendanceViewClass[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  const { matchedItems, currentMatchIndex, performSearch, navigateMatch } = useHighlightSearch({
    rowSelector: '.staff-table tbody tr',
    nameSelector: '.col-name',
    phoneSelector: '.col-phone',
    highlightClass: 'row-highlight',
    activeHighlightClass: 'row-active-highlight',
  });

  const msgModal = useMessageModal();

  const fetchData = useCallback(async () => {
    const res = await attendanceViewApi.getDetail(slotSeq);
    if (res.success) setClasses(res.data);
    setLoading(false);
  }, [slotSeq]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div style={{ padding: 20 }}>로딩 중...</div>;

  return (
    <>
      <div className="staff-view-container">
        <div className="back-nav">
          <button className="btn-back" onClick={() => router.push(ROUTES.COMPLEX_ATTENDANCE)}>
            <span>⬅</span> 전체 현황 리스트로
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
                      const history = m.attendanceHistory || [];

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
                          <td className="col-date">{m.expiryDate || ''}</td>
                          <td className="col-stats">{stats}</td>
                          <td>{m.membershipName || '-'}</td>
                          <td>
                            <div className="history-grid">
                              {history.map((h, hi) => (
                                <div key={hi} className={`history-cell ${h === 'O' ? 'present' : h === '△' ? 'postponed' : ''}`}>{h}</div>
                              ))}
                              {Array.from({ length: Math.max(0, 14 - history.length) }).map((_, fi) => (
                                <div key={`empty-${fi}`} className="history-cell"></div>
                              ))}
                            </div>
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
