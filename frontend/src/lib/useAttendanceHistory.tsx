'use client';

import { useState, useCallback } from 'react';
import AttendanceHistoryModal from '@/components/ui/AttendanceHistoryModal';
import { type Column } from '@/components/ui/DataTable';

type HistoryType = 'member' | 'staff';

export function useAttendanceHistory<T extends { seq: number; name: string }>(type: HistoryType) {
  const [target, setTarget] = useState<{ seq: number; name: string } | null>(null);

  const open = useCallback((item: T) => {
    setTarget({ seq: item.seq, name: item.name });
  }, []);

  const close = useCallback(() => setTarget(null), []);

  const column: Column<T> = {
    header: '히스토리',
    render: (item) => (
      <button
        onClick={(e) => { e.stopPropagation(); open(item); }}
        style={{
          background: '#4a90e2', color: '#fff', border: 'none', borderRadius: 3,
          padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600,
        }}
      >
        히스토리
      </button>
    ),
  };

  const modal = target ? (
    <AttendanceHistoryModal seq={target.seq} name={target.name} type={type} onClose={close} />
  ) : null;

  return { column, modal };
}
