'use client';

import { type Reservation } from '../utils';
import ReservationChip from './ReservationChip';
import s from './calendar.module.css';

const MONTH_CELL_MAX = 3;

export default function MonthDayCell({ date, reservations, isCurrentMonth, isToday, onSelect }: {
  date: Date; reservations: Reservation[]; isCurrentMonth: boolean; isToday: boolean; onSelect: (date: Date) => void;
}) {
  const overflow = reservations.length - MONTH_CELL_MAX;
  const cellClass = isToday ? s.dayCellToday : isCurrentMonth ? s.dayCellCurrent : s.dayCellOther;

  return (
    <div onClick={() => onSelect(date)} className={cellClass}>
      <div className={s.dayCellHeader}>
        <span className={isToday ? s.dayNumberToday : s.dayNumber}>{date.getDate()}</span>
        {reservations.length > 0 && <span className={s.dayCount}>{reservations.length}건</span>}
      </div>
      <div className={s.dayChips}>
        {reservations.slice(0, MONTH_CELL_MAX).map((r) => <ReservationChip key={r.seq} r={r} compact />)}
        {overflow > 0 && <div className={s.overflowBtn}>+{overflow}건 더보기</div>}
      </div>
    </div>
  );
}
