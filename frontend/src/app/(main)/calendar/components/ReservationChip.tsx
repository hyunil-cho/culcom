'use client';

import { type Reservation, getStatusStyle } from '../utils';
import s from './calendar.module.css';

export default function ReservationChip({ r, compact }: { r: Reservation; compact?: boolean }) {
  const st = getStatusStyle(r.status);
  return (
    <div
      className={compact ? s.chipCompact : s.chip}
      title={`${r.time} ${r.name} (${r.phone})\nCALLER ${r.caller} · ${r.status}${r.memo ? '\n' + r.memo : ''}`}
    >
      <span className={s.chipTime} style={{ minWidth: compact ? 30 : 36 }}>{r.time}</span>
      <span className={s.chipName}>{r.name}</span>
      <span className={s.chipStatus} style={{ backgroundColor: st.bg, color: st.color, fontSize: compact ? 9 : 10 }}>
        {r.status}
      </span>
    </div>
  );
}
