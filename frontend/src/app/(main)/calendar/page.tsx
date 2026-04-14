'use client';

import { useState, useMemo } from 'react';
import { calendarApi, type CalendarReservation, type CalendarEvent } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { queryClient } from '@/lib/queryClient';
import {
  type Reservation, type CalendarEventItem, type ViewMode, DAY_LABELS,
  formatDateKey, getWeekDates, getMonthDates, isSameDay, toReservationMap, toEventMap, getStatusStyle,
} from './utils';
import ReservationChip from './components/ReservationChip';
import MonthDayCell from './components/MonthDayCell';
import DayDetailPanel from './components/DayDetailPanel';
import ReservationStatusModal from './components/ReservationStatusModal';
import { useModal } from '@/hooks/useModal';
import Spinner from '@/components/ui/Spinner';
import s from './components/calendar.module.css';

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const statusModal = useModal<Reservation>();

  const today = new Date();

  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      const week = getWeekDates(currentDate);
      return { start: formatDateKey(week[0]), end: formatDateKey(week[6]) };
    }
    const weeks = getMonthDates(currentDate.getFullYear(), currentDate.getMonth());
    const allDates = weeks.flat();
    return { start: formatDateKey(allDates[0]), end: formatDateKey(allDates[allDates.length - 1]) };
  }, [viewMode, currentDate]);

  const { data: rawReservations, isLoading: loading } = useApiQuery<CalendarReservation[]>(
    ['reservations', dateRange.start, dateRange.end],
    () => calendarApi.getReservations(dateRange.start, dateRange.end),
  );

  const { data: rawEvents } = useApiQuery<CalendarEvent[]>(
    ['calendarEvents', dateRange.start, dateRange.end],
    () => calendarApi.getEvents(dateRange.start, dateRange.end),
  );

  const reservationMap = useMemo(() => toReservationMap(rawReservations ?? []), [rawReservations]);
  const eventMap = useMemo(() => toEventMap(rawEvents ?? []), [rawEvents]);

  const invalidateReservations = () => queryClient.invalidateQueries({ queryKey: ['reservations'] });

  const getReservations = (date: Date): Reservation[] => reservationMap[formatDateKey(date)] || [];
  const getEvents = (date: Date): CalendarEventItem[] => eventMap[formatDateKey(date)] || [];

  const navigatePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'week') d.setDate(d.getDate() - 7); else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };
  const navigateNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'week') d.setDate(d.getDate() + 7); else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const headerTitle = viewMode === 'week'
    ? (() => {
        const week = getWeekDates(currentDate);
        const [st, en] = [week[0], week[6]];
        return st.getMonth() === en.getMonth()
          ? `${st.getFullYear()}년 ${st.getMonth() + 1}월 ${st.getDate()}일 — ${en.getDate()}일`
          : `${st.getMonth() + 1}월 ${st.getDate()}일 — ${en.getMonth() + 1}월 ${en.getDate()}일`;
      })()
    : `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;

  /* 주간 뷰 */
  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);
    return (
      <div className={s.calendarGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {weekDates.map((date, i) => {
          const isT = isSameDay(date, today);
          const isSun = i === 6, isSat = i === 5;
          return (
            <div key={i} className={s.weekDayHeader}
              style={{ borderRight: i < 6 ? '1px solid var(--border)' : 'none', backgroundColor: isT ? '#eef2ff' : '#f9fafb' }}>
              <div className={s.weekDayLabel} style={{ color: isSun ? '#ef4444' : isSat ? '#3b82f6' : '#6b7280' }}>
                {DAY_LABELS[i]}
              </div>
              <div className={isT ? s.weekDateToday : s.weekDateNumber}>{date.getDate()}</div>
            </div>
          );
        })}
        {weekDates.map((date, i) => {
          const reservations = getReservations(date);
          const events = getEvents(date);
          const totalCount = reservations.length + events.length;
          const isT = isSameDay(date, today);
          return (
            <div key={`body-${i}`} onClick={() => setSelectedDate(date)}
              className={isT ? s.weekBodyToday : s.weekBody}
              style={{ borderRight: i < 6 ? '1px solid var(--border)' : 'none' }}>
              {totalCount > 0 && <div className={s.weekCountLabel}>{totalCount}건</div>}
              <div className={s.weekChips}>
                {events.map((ev) => (
                  <div key={`e-${ev.seq}`} className={s.eventChip} style={{ padding: '4px 8px', fontSize: '12px' }}>
                    <span className={s.eventChipTime} style={{ minWidth: 36 }}>{ev.startTime}</span>
                    <span className={s.eventChipTitle}>{ev.title}</span>
                  </div>
                ))}
                {reservations.map((r) => <ReservationChip key={r.seq} r={r} />)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* 월간 뷰 */
  const renderMonthView = () => {
    const weeks = getMonthDates(currentDate.getFullYear(), currentDate.getMonth());
    return (
      <div className={s.calendarGrid}>
        <div className={s.monthDayHeaderRow}>
          {DAY_LABELS.map((label, i) => (
            <div key={label} className={s.monthDayLabel}
              style={{ color: i === 6 ? '#ef4444' : i === 5 ? '#3b82f6' : '#6b7280', borderRight: i < 6 ? '1px solid var(--border)' : 'none' }}>
              {label}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className={s.monthWeekRow}>
            {week.map((date, di) => (
              <MonthDayCell key={di} date={date} reservations={getReservations(date)} events={getEvents(date)}
                isCurrentMonth={date.getMonth() === currentDate.getMonth()} isToday={isSameDay(date, today)}
                onSelect={setSelectedDate} />
            ))}
          </div>
        ))}
      </div>
    );
  };

  /* 통계 */
  const allReservations = useMemo(() => Object.values(reservationMap).flat(), [reservationMap]);
  const totalReservations = allReservations.length;
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allReservations.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return counts;
  }, [allReservations]);

  return (
    <>
      <h2 className="page-title">상담 예약 캘린더</h2>

      {/* 통계 카드 */}
      <div className={s.statsGrid}>
        <div className={`card ${s.statCard}`} style={{ borderLeft: '4px solid #4f46e5' }}>
          <div className={s.statLabel}>전체 예약</div>
          <div className={s.statValue}>{totalReservations}</div>
        </div>
        {Object.keys(statusCounts).map((status) => {
          const st = getStatusStyle(status);
          return (
            <div key={status} className={`card ${s.statCard}`} style={{ borderLeft: `4px solid ${st.color}` }}>
              <div className={s.statLabel}>{status}</div>
              <div className={s.statValue} style={{ color: st.color }}>{statusCounts[status]}</div>
            </div>
          );
        })}
      </div>

      {/* 툴바 */}
      <div className={s.toolbar}>
        <div className={s.toolbarLeft}>
          <button onClick={() => setCurrentDate(new Date())} className={s.navBtn}>오늘</button>
          <button onClick={navigatePrev} className={s.navBtnSmall}>‹</button>
          <button onClick={navigateNext} className={s.navBtnSmall}>›</button>
          <h3 className={s.headerTitle}>{headerTitle}</h3>
          {loading && <Spinner size="sm" />}
        </div>
        <div className={s.viewToggle}>
          {([['week', '주간'], ['month', '월간']] as const).map(([mode, label]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={viewMode === mode ? s.viewBtnActive : s.viewBtnInactive}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 캘린더 */}
      {viewMode === 'week' ? renderWeekView() : renderMonthView()}

      {/* 일별 상세 사이드 패널 */}
      {selectedDate && (
        <>
          <div onClick={() => setSelectedDate(null)} className={s.panelOverlay} />
          <DayDetailPanel date={selectedDate} reservations={getReservations(selectedDate)}
            events={getEvents(selectedDate)}
            onClose={() => setSelectedDate(null)} onReservationClick={(r) => statusModal.open(r)} />
        </>
      )}

      {/* 예약 상태 변경 모달 */}
      {statusModal.isOpen && (
        <ReservationStatusModal reservation={statusModal.data!}
          onClose={statusModal.close} onStatusChanged={invalidateReservations} />
      )}
    </>
  );
}
