import type { CalendarReservation, CalendarEvent } from '@/lib/api';

export interface CalendarEventItem {
  seq: number;
  title: string;
  content?: string;
  author: string;
  startTime: string;  // "HH:mm"
  endTime: string;    // "HH:mm"
}

export interface Reservation {
  seq: number;
  time: string;       // "HH:mm"
  name: string;
  phone: string;
  caller: string;
  status: string;
  memo?: string;
}

export type ViewMode = 'week' | 'month';

export const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

export const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  '예약확정': { bg: '#dbeafe', color: '#1e40af' },
  '신규': { bg: '#f3f4f6', color: '#374151' },
  '진행중': { bg: '#fef3c7', color: '#92400e' },
  '콜수초과': { bg: '#fee2e2', color: '#991b1b' },
  '전화상거절': { bg: '#fee2e2', color: '#991b1b' },
  '연기': { bg: '#fef3c7', color: '#b45309' },
  '취소': { bg: '#fee2e2', color: '#991b1b' },
  '방문': { bg: '#d1fae5', color: '#065f46' },
};

const DEFAULT_STATUS_STYLE = { bg: '#f3f4f6', color: '#6b7280' };

export function getStatusStyle(status: string) {
  return STATUS_STYLES[status] || DEFAULT_STATUS_STYLE;
}

export function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getWeekDates(base: Date): Date[] {
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(base);
  mon.setDate(base.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

export function getMonthDates(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const firstDay = first.getDay();
  const startOffset = firstDay === 0 ? -6 : 1 - firstDay;

  const weeks: Date[][] = [];
  let current = new Date(year, month, 1 + startOffset);

  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    if (w >= 4 && week[0].getMonth() !== month) break;
    weeks.push(week);
  }
  return weeks;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function toReservationMap(items: CalendarReservation[]): Record<string, Reservation[]> {
  const map: Record<string, Reservation[]> = {};
  items.forEach((item) => {
    const [datePart, timePart] = item.interviewDate.split(' ');
    if (!datePart) return;
    if (!map[datePart]) map[datePart] = [];
    map[datePart].push({
      seq: item.seq,
      time: timePart || '00:00',
      name: item.customerName,
      phone: item.customerPhone,
      caller: item.caller,
      status: item.status,
      memo: item.memo ?? undefined,
    });
  });
  Object.values(map).forEach((arr) => arr.sort((a, b) => a.time.localeCompare(b.time)));
  return map;
}

export function toEventMap(items: CalendarEvent[]): Record<string, CalendarEventItem[]> {
  const map: Record<string, CalendarEventItem[]> = {};
  items.forEach((item) => {
    const dateKey = item.eventDate;
    if (!dateKey) return;
    if (!map[dateKey]) map[dateKey] = [];
    map[dateKey].push({
      seq: item.seq,
      title: item.title,
      content: item.content ?? undefined,
      author: item.author,
      startTime: item.startTime.substring(0, 5),
      endTime: item.endTime.substring(0, 5),
    });
  });
  Object.values(map).forEach((arr) => arr.sort((a, b) => a.startTime.localeCompare(b.startTime)));
  return map;
}
