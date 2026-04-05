'use client';

import { useMemo } from 'react';
import { type Reservation, DAY_LABELS, getStatusStyle } from '../utils';
import s from './calendar.module.css';

export default function DayDetailPanel({ date, reservations, onClose, onReservationClick }: {
  date: Date; reservations: Reservation[]; onClose: () => void; onReservationClick: (r: Reservation) => void;
}) {
  const dayLabel = `${date.getMonth() + 1}월 ${date.getDate()}일 (${DAY_LABELS[(date.getDay() + 6) % 7]})`;

  const grouped = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    reservations.forEach((r) => { const hour = r.time.split(':')[0] + ':00'; if (!map[hour]) map[hour] = []; map[hour].push(r); });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [reservations]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    reservations.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return Object.entries(counts);
  }, [reservations]);

  return (
    <div className={s.panel}>
      <div className={s.panelHeader}>
        <div>
          <h3 className={s.panelTitle}>{dayLabel}</h3>
          <span className={s.panelSubtitle}>총 {reservations.length}건</span>
        </div>
        <button onClick={onClose} className={s.panelCloseBtn}>×</button>
      </div>

      <div className={s.panelStatusBar}>
        {statusCounts.map(([status, count]) => {
          const st = getStatusStyle(status);
          return <span key={status} className={s.panelStatusBadge} style={{ backgroundColor: st.bg, color: st.color }}>{status} {count}</span>;
        })}
      </div>

      <div className={s.panelBody}>
        {reservations.length === 0 ? (
          <div className={s.panelEmpty}>예약이 없습니다</div>
        ) : (
          <div className={s.panelGroup}>
            {grouped.map(([hour, items]) => (
              <div key={hour}>
                <div className={s.panelHour}>{hour}</div>
                <div className={s.panelHourItems}>
                  {items.map((r) => {
                    const st = getStatusStyle(r.status);
                    return (
                      <div key={r.seq} onClick={() => onReservationClick(r)} className={s.panelItem}>
                        <div className={s.panelItemHeader}>
                          <span className={s.panelItemName}>{r.time} {r.name}</span>
                          <span className={s.panelItemBadge} style={{ backgroundColor: st.bg, color: st.color }}>{r.status}</span>
                        </div>
                        <div className={s.panelItemMeta}>
                          <span className={s.panelCallerBadge}>CALLER {r.caller}</span>
                          <span>{r.phone}</span>
                        </div>
                        {r.memo && <div className={s.panelItemMemo}>{r.memo}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
