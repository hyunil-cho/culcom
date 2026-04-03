'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { attendanceViewApi, AttendanceViewClass, AttendanceViewMember } from '@/lib/api';
import { ROUTES } from '@/lib/routes';

export default function AttendanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slotSeq = Number(params.slotSeq);

  const [classes, setClasses] = useState<AttendanceViewClass[]>([]);
  const [slotName, setSlotName] = useState('');
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  // 검색
  const [matchedRows, setMatchedRows] = useState<HTMLElement[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  const fetchData = useCallback(async () => {
    const res = await attendanceViewApi.getDetail(slotSeq);
    if (res.success) setClasses(res.data);
    setLoading(false);
  }, [slotSeq]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 검색 실행
  const performSearch = (type: 'name' | 'phone') => {
    document.querySelectorAll('.row-highlight, .row-active-highlight').forEach(el => {
      el.classList.remove('row-highlight', 'row-active-highlight');
    });

    const input = type === 'name'
      ? (document.getElementById('nameSearchInput') as HTMLInputElement)
      : (document.getElementById('phoneSearchInput') as HTMLInputElement);
    const keyword = input?.value.trim();
    if (!keyword) return;

    const selector = type === 'name' ? '.col-name' : '.col-phone';
    const allRows = Array.from(document.querySelectorAll('.staff-table tbody tr')) as HTMLElement[];
    const matched: HTMLElement[] = [];

    allRows.forEach(row => {
      const target = row.querySelector(selector);
      if (target && target.textContent?.includes(keyword)) {
        row.classList.add('row-highlight');
        matched.push(row);
      }
    });

    if (matched.length > 0) {
      setMatchedRows(matched);
      setCurrentMatchIndex(0);
      matched[0].classList.add('row-active-highlight');
      matched[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setMatchedRows([]);
      setCurrentMatchIndex(-1);
      alert('검색 결과가 없습니다.');
    }
  };

  const navigateMatch = (dir: number) => {
    if (matchedRows.length === 0) return;
    matchedRows.forEach(el => el.classList.remove('row-active-highlight'));
    const next = (currentMatchIndex + dir + matchedRows.length) % matchedRows.length;
    setCurrentMatchIndex(next);
    matchedRows[next].classList.add('row-active-highlight');
    matchedRows[next].scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // 클래스별 출석률 계산
  const calcClassRate = (members: AttendanceViewMember[]) => {
    let totalCells = 0, presentCells = 0;
    members.forEach(m => {
      if (m.staff) return;
      const history = m.attendanceHistory || [];
      totalCells += history.length;
      presentCells += history.filter(h => h === 'O').length;
    });
    const pct = totalCells > 0 ? Math.round(presentCells / totalCells * 100) : 0;
    return { text: `최근 ${presentCells}/${totalCells}회 · ${pct}%`, pct };
  };

  const rateBadgeClass = (pct: number) => {
    if (pct >= 80) return 'rate-high';
    if (pct >= 60) return 'rate-mid';
    return 'rate-low';
  };

  if (loading) return <div style={{ padding: 20 }}>로딩 중...</div>;

  return (
    <>
      <style>{`
        .staff-view-container { padding: 20px; background: #f4f7f6; min-height: 100vh; font-family: 'Malgun Gothic', sans-serif; }
        .staff-header { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .staff-title { color: #2c3e50; font-size: 1.5rem; font-weight: bold; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .search-bar-group { display: flex; gap: 10px; flex-wrap: wrap; background: #f8f9fa; padding: 15px; border-radius: 6px; }
        .search-item { display: flex; align-items: center; gap: 5px; }
        .search-input { padding: 6px 10px; border: 1px solid #ced4da; border-radius: 4px; font-size: 0.9rem; }
        .btn-search { padding: 6px 12px; background: #4a90e2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: 600; }
        .staff-table-wrapper { background: #fff; border-radius: 8px; overflow-x: auto; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .staff-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; min-width: 1200px; }
        .staff-table th { background: #f8f9fa; color: #495057; font-weight: 600; padding: 12px 8px; border-bottom: 2px solid #dee2e6; text-align: center; white-space: nowrap; }
        .staff-table td { padding: 10px 8px; border-bottom: 1px solid #eee; text-align: center; color: #333; vertical-align: middle; }
        .staff-table tr:hover { background-color: #f1f8ff; }
        .row-highlight { background-color: #fff9c4 !important; transition: background-color 0.3s ease; }
        .row-active-highlight { background-color: #ffd600 !important; outline: 2px solid #fbc02d; transition: all 0.2s ease; }
        .search-result-info { display: flex; align-items: center; gap: 10px; background: #e3f2fd; padding: 5px 15px; border-radius: 20px; font-size: 0.85rem; color: #1976d2; font-weight: 600; margin-left: auto; }
        .btn-nav { background: #fff; border: 1px solid #bbdefb; border-radius: 4px; padding: 2px 8px; cursor: pointer; color: #1976d2; font-size: 0.75rem; }
        .btn-nav:hover { background: #1976d2; color: #fff; }
        .col-index { width: 40px; color: #adb5bd; }
        .col-name { font-weight: bold; color: #4a90e2; min-width: 80px; }
        .col-phone { font-family: monospace; min-width: 110px; }
        .col-date { font-size: 0.8rem; color: #666; min-width: 90px; }
        .col-stats { color: #e67e22; font-weight: 600; }
        .grade-badge { padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; background: #e9ecef; }
        .grade-vvip { background: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
        .grade-a { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        .history-grid { display: flex; gap: 2px; justify-content: center; }
        .history-cell { width: 22px; height: 22px; border: 1px solid #dee2e6; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: bold; background: #fff; }
        .history-cell.present { background: #2ecc71; color: white; border-color: #27ae60; }
        .back-nav { margin-bottom: 15px; }
        .btn-back { text-decoration: none; color: #666; font-size: 0.9rem; display: flex; align-items: center; gap: 5px; cursor: pointer; background: none; border: none; padding: 0; }
        .btn-back:hover { color: #4a90e2; }
        .attend-rate-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; white-space: nowrap; background: #e9ecef; color: #868e96; border: 1px solid #dee2e6; vertical-align: middle; }
        .attend-rate-badge::before { content: ''; display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: currentColor; opacity: 0.7; }
        .rate-high { background: #ebfbee; color: #2b8a3e; border-color: #b2f2bb; }
        .rate-mid { background: #fff9db; color: #e67700; border-color: #ffec99; }
        .rate-low { background: #fff5f5; color: #c92a2a; border-color: #ffa8a8; }
      `}</style>

      <div className="staff-view-container">
        <div className="back-nav">
          <button className="btn-back" onClick={() => router.push(ROUTES.COMPLEX_ATTENDANCE)}>
            <span>⬅</span> 전체 현황 리스트로
          </button>
        </div>

        <div className="staff-header">
          <div className="staff-title">
            <span>🏫 상세 등록현황 (Staff)</span>
            <span style={{ fontSize: '0.9rem', color: '#888', fontWeight: 'normal' }}>오늘 날짜: {today}</span>
          </div>

          <div className="search-bar-group">
            <div className="search-item">
              이름 검색 <input type="text" id="nameSearchInput" className="search-input" placeholder="이름 입력"
                onKeyDown={e => e.key === 'Enter' && performSearch('name')} />
              <button className="btn-search" onClick={() => performSearch('name')}>회원 이름 검색</button>
            </div>
            <div className="search-item">
              전화번호 4자리 <input type="text" id="phoneSearchInput" className="search-input" placeholder="번호 4자리"
                onKeyDown={e => e.key === 'Enter' && performSearch('phone')} />
              <button className="btn-search" onClick={() => performSearch('phone')}>검색</button>
            </div>

            {matchedRows.length > 0 && (
              <div className="search-result-info">
                <span>{currentMatchIndex + 1} / {matchedRows.length}</span>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button className="btn-nav" onClick={() => navigateMatch(-1)}>◀ 이전</button>
                  <button className="btn-nav" onClick={() => navigateMatch(1)}>다음 ▶</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {classes.map(cls => {
          const rate = calcClassRate(cls.members);
          return (
            <div key={cls.classSeq} className="class-section" style={{ marginBottom: 40 }}>
              <h3 style={{ marginBottom: 10, color: '#4a90e2', display: 'flex', alignItems: 'center', gap: 10 }}>
                📍 {cls.name}
                <span className={`attend-rate-badge ${rateBadgeClass(rate.pct)}`}>{rate.text}</span>
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
                      <th>멤버쉽등급</th>
                      <th colSpan={10}>최근 출석기록</th>
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
                          <td>
                            <span className={`grade-badge ${m.grade === 'VVIP+' || m.grade === 'VVIP' ? 'grade-vvip' : m.grade === 'A+' ? 'grade-a' : ''}`}>
                              {m.grade || '-'}
                            </span>
                          </td>
                          <td>
                            <div className="history-grid">
                              {history.map((h, hi) => (
                                <div key={hi} className={`history-cell ${h === 'O' ? 'present' : ''}`}>{h}</div>
                              ))}
                              {Array.from({ length: Math.max(0, 10 - history.length) }).map((_, fi) => (
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
    </>
  );
}
