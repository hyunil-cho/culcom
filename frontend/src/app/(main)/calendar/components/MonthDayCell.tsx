'use client';

import { type Reservation, type CalendarEventItem } from '../utils';
import ReservationChip from './ReservationChip';
import s from './calendar.module.css';

const MONTH_CELL_MAX = 3;

export default function MonthDayCell({ date, reservations, events, isCurrentMonth, isToday, onSelect }: {
  date: Date; reservations: Reservation[]; events: CalendarEventItem[]; isCurrentMonth: boolean; isToday: boolean; onSelect: (date: Date) => void;
}) {
  const totalCount = reservations.length + events.length;

  // 이벤트 먼저, 예약 나중에
  const combined = [
    ...events.map((e) => ({ type: 'event' as const, key: `e-${e.seq}`, data: e })),
    ...reservations.map((r) => ({ type: 'reservation' as const, key: `r-${r.seq}`, data: r })),
  ];
  const overflow = combined.length - MONTH_CELL_MAX;
  const cellClass = isToday ? s.dayCellToday : isCurrentMonth ? s.dayCellCurrent : s.dayCellOther;

  return (
    <div onClick={() => onSelect(date)} className={cellClass}>
      <div className={s.dayCellHeader}>
        <span className={isToday ? s.dayNumberToday : s.dayNumber}>{date.getDate()}</span>
        {totalCount > 0 && <span className={s.dayCount}>{totalCount}건</span>}
      </div>
      <div className={s.dayChips}>
        {combined.slice(0, MONTH_CELL_MAX).map((item) =>
          item.type === 'event'
            ? <div key={item.key} className={s.eventChip} title={`${item.data.startTime}—${item.data.endTime} ${item.data.title}`}>
                <span className={s.eventChipTime}>{item.data.startTime}</span>
                <span className={s.eventChipTitle}>{item.data.title}</span>
              </div>
            : <ReservationChip key={item.key} r={item.data} compact />
        )}
        {overflow > 0 && <div className={s.overflowBtn}>+{overflow}건 더보기</div>}
      </div>
    </div>
  );
}
