'use client';

import { type Column } from '@/components/ui/DataTable';

const CELL_BASE: React.CSSProperties = {
  width: 20, height: 20, border: '1px solid #dee2e6',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '0.65rem', fontWeight: 'bold',
};

function cellStyle(mark: string): React.CSSProperties {
  if (mark === 'O') return { ...CELL_BASE, background: '#2ecc71', color: '#fff', borderColor: '#27ae60' };
  if (mark === '△') return { ...CELL_BASE, background: '#fff3cd', color: '#856404', borderColor: '#ffeeba' };
  return { ...CELL_BASE, background: '#fff', color: '#adb5bd' };
}

export function AttendanceHistoryCells({ history, size = 14 }: { history?: string[]; size?: number }) {
  const list = history || [];
  return (
    <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
      {list.map((h, i) => (
        <div key={i} style={cellStyle(h)}>{h}</div>
      ))}
      {Array.from({ length: Math.max(0, size - list.length) }).map((_, i) => (
        <div key={`e${i}`} style={cellStyle('')} />
      ))}
    </div>
  );
}

interface Options<T> {
  header?: string;
  size?: number;
  getHistory?: (row: T) => string[] | undefined;
}

export function useAttendanceHistoryColumn<T extends { attendanceHistory?: string[] }>(
  options: Options<T> = {},
): Column<T> {
  const { header = '최근 출석기록', size = 14, getHistory = (r) => r.attendanceHistory } = options;
  return {
    header,
    render: (row) => <AttendanceHistoryCells history={getHistory(row)} size={size} />,
  };
}
