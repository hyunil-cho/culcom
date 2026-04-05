import { AttendanceViewMember } from '@/lib/api';
import { rateBadgeClass } from '@/lib/useHighlightSearch';

/** 오늘 출석 기반 출석률 (통합 뷰용) */
export function calcTodayRate(members: AttendanceViewMember[]) {
  let total = 0, present = 0, postponed = 0;
  members.forEach(m => {
    if (m.postponed) { postponed++; return; }
    total++;
    if (m.status === 'O') present++;
  });
  const pct = total > 0 ? Math.round(present / total * 100) : 0;
  const suffix = postponed > 0 ? ` (연기 ${postponed})` : '';
  return { text: `${present}/${total}명 · ${pct}%${suffix}`, pct };
}

/** 최근 출석기록 기반 출석률 (상세 뷰용) */
export function calcHistoryRate(members: AttendanceViewMember[]) {
  let totalCells = 0, presentCells = 0;
  members.forEach(m => {
    if (m.staff) return;
    const history = m.attendanceHistory || [];
    totalCells += history.length;
    presentCells += history.filter(h => h === 'O').length;
  });
  const pct = totalCells > 0 ? Math.round(presentCells / totalCells * 100) : 0;
  return { text: `최근 ${presentCells}/${totalCells}회 · ${pct}%`, pct };
}

export function RateBadge({ rate }: { rate: { text: string; pct: number } }) {
  return <span className={`attend-rate-badge ${rateBadgeClass(rate.pct)}`}>{rate.text}</span>;
}
