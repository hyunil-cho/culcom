'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { calendarApi, surveyApi, type CalendarReservation, type SurveyTemplate } from '@/lib/api';
import { ROUTES } from '@/lib/routes';

/* ──────────── 타입 ──────────── */

interface Reservation {
  seq: number;
  time: string;       // "HH:mm"
  name: string;
  phone: string;
  caller: string;
  status: string;
  memo?: string;
}

type ViewMode = 'week' | 'month';

/* ──────────── 유틸 ──────────── */

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekDates(base: Date): Date[] {
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

function getMonthDates(year: number, month: number): Date[][] {
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

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** API 응답 → 날짜별 Reservation 맵으로 변환 */
function toReservationMap(items: CalendarReservation[]): Record<string, Reservation[]> {
  const map: Record<string, Reservation[]> = {};
  items.forEach((item) => {
    // interviewDate: "yyyy-MM-dd HH:mm"
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
  // 각 날짜 내 시간순 정렬
  Object.values(map).forEach((arr) => arr.sort((a, b) => a.time.localeCompare(b.time)));
  return map;
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
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

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] || DEFAULT_STATUS_STYLE;
}

/* ──────────── 컴포넌트: 예약 칩 ──────────── */

function ReservationChip({ r, compact }: { r: Reservation; compact?: boolean }) {
  const st = getStatusStyle(r.status);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: compact ? '2px 6px' : '4px 8px',
        borderRadius: 6,
        backgroundColor: '#f9fafb',
        borderLeft: '3px solid #4f46e5',
        fontSize: compact ? 11 : 12,
        lineHeight: 1.4,
        cursor: 'pointer',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f0f0f5'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f9fafb'; }}
      title={`${r.time} ${r.name} (${r.phone})\nCALLER ${r.caller} · ${r.status}${r.memo ? '\n' + r.memo : ''}`}
    >
      <span style={{ fontWeight: 600, color: '#374151', minWidth: compact ? 30 : 36 }}>{r.time}</span>
      <span style={{ color: '#111827', fontWeight: 500 }}>{r.name}</span>
      {!compact && (
        <span style={{
          marginLeft: 'auto',
          padding: '1px 6px',
          borderRadius: 10,
          fontSize: 10,
          fontWeight: 600,
          backgroundColor: st.bg,
          color: st.color,
        }}>
          {r.status}
        </span>
      )}
    </div>
  );
}

/* ──────────── 컴포넌트: 일별 셀 (월간) ──────────── */

const MONTH_CELL_MAX = 3;

function MonthDayCell({
  date,
  reservations,
  isCurrentMonth,
  isToday,
  onSelect,
}: {
  date: Date;
  reservations: Reservation[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onSelect: (date: Date) => void;
}) {
  const overflow = reservations.length - MONTH_CELL_MAX;

  return (
    <div
      onClick={() => onSelect(date)}
      style={{
        minHeight: 120,
        padding: 6,
        borderRight: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        backgroundColor: isToday ? '#eef2ff' : isCurrentMonth ? '#fff' : '#f9fafb',
        opacity: isCurrentMonth ? 1 : 0.5,
        cursor: 'pointer',
        transition: 'background-color 0.15s',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        if (!isToday) (e.currentTarget as HTMLElement).style.backgroundColor = '#f5f5ff';
      }}
      onMouseLeave={(e) => {
        if (!isToday) (e.currentTarget as HTMLElement).style.backgroundColor = isCurrentMonth ? '#fff' : '#f9fafb';
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
      }}>
        <span style={{
          fontSize: 13,
          fontWeight: isToday ? 700 : 500,
          color: isToday ? '#fff' : '#374151',
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          backgroundColor: isToday ? '#4f46e5' : 'transparent',
        }}>
          {date.getDate()}
        </span>
        {reservations.length > 0 && (
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#6b7280',
            backgroundColor: '#f3f4f6',
            padding: '1px 6px',
            borderRadius: 8,
          }}>
            {reservations.length}건
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {reservations.slice(0, MONTH_CELL_MAX).map((r) => (
          <ReservationChip key={r.seq} r={r} compact />
        ))}
        {overflow > 0 && (
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#4f46e5',
            textAlign: 'center',
            padding: '2px 0',
            borderRadius: 4,
            backgroundColor: '#eef2ff',
          }}>
            +{overflow}건 더보기
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────── 컴포넌트: 예약 상태 변경 모달 ──────────── */

function ReservationStatusModal({ reservation, onClose, onStatusChanged }: {
  reservation: Reservation;
  onClose: () => void;
  onStatusChanged: () => void;
}) {
  const [step, setStep] = useState<'select' | 'survey'>('select');
  const [surveys, setSurveys] = useState<SurveyTemplate[]>([]);
  const [updating, setUpdating] = useState(false);

  const handleStatus = async (status: '연기' | '취소' | '방문') => {
    if (status === '방문') {
      setUpdating(true);
      const res = await calendarApi.updateReservationStatus(reservation.seq, status);
      if (res.success) {
        // 설문지 목록 로드
        const surveyRes = await surveyApi.listTemplates();
        if (surveyRes.success) {
          setSurveys(surveyRes.data.filter(t => t.status === '활성'));
        }
        setStep('survey');
      }
      setUpdating(false);
      onStatusChanged();
      return;
    }
    // 연기, 취소
    setUpdating(true);
    const res = await calendarApi.updateReservationStatus(reservation.seq, status);
    setUpdating(false);
    if (res.success) {
      onStatusChanged();
      onClose();
    }
  };

  const handleSurveySelect = (surveySeq: number) => {
    const url = ROUTES.COMPLEX_SURVEY_FILL(surveySeq)
      + `?name=${encodeURIComponent(reservation.name)}`
      + `&phone=${encodeURIComponent(reservation.phone)}`
      + `&reservationSeq=${reservation.seq}`;
    window.open(url, '_blank');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.5)', zIndex: 10001,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 12, width: '90%', maxWidth: 440,
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              {step === 'select' ? '예약 상태 변경' : '설문지 선택'}
            </h3>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', fontSize: 20, color: '#999', cursor: 'pointer',
            }}>x</button>
          </div>
          <div style={{ fontSize: '0.88rem', color: '#666', marginTop: 4 }}>
            {reservation.time} {reservation.name} ({reservation.phone})
          </div>
        </div>

        {/* 본문 */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          {step === 'select' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button disabled={updating} onClick={() => handleStatus('연기')} style={{
                padding: '0.85rem 1rem', borderRadius: 8, border: '1.5px solid #fbbf24',
                background: '#fffbeb', color: '#b45309', fontWeight: 700, fontSize: '0.95rem',
                cursor: 'pointer', textAlign: 'left',
              }}>
                <div>연기</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 400, marginTop: 2 }}>예약이 다른 날짜로 미뤄진 경우</div>
              </button>
              <button disabled={updating} onClick={() => handleStatus('취소')} style={{
                padding: '0.85rem 1rem', borderRadius: 8, border: '1.5px solid #fca5a5',
                background: '#fef2f2', color: '#991b1b', fontWeight: 700, fontSize: '0.95rem',
                cursor: 'pointer', textAlign: 'left',
              }}>
                <div>취소</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 400, marginTop: 2 }}>고객이 예약을 취소한 경우</div>
              </button>
              <button disabled={updating} onClick={() => handleStatus('방문')} style={{
                padding: '0.85rem 1rem', borderRadius: 8, border: '1.5px solid #6ee7b7',
                background: '#ecfdf5', color: '#065f46', fontWeight: 700, fontSize: '0.95rem',
                cursor: 'pointer', textAlign: 'left',
              }}>
                <div>방문</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 400, marginTop: 2 }}>고객이 실제로 방문한 경우 (설문지 작성)</div>
              </button>
            </div>
          ) : (
            <div>
              {surveys.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#999' }}>
                  활성화된 설문지가 없습니다.<br />
                  <span style={{ fontSize: '0.82rem' }}>설문 관리에서 설문지를 활성화해주세요.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: '0.88rem', color: '#555', marginBottom: 4 }}>
                    고객에게 보여줄 설문지를 선택하세요.
                  </p>
                  {surveys.map(s => (
                    <button key={s.seq} onClick={() => handleSurveySelect(s.seq)} style={{
                      padding: '0.75rem 1rem', borderRadius: 8, border: '1.5px solid #dde8e3',
                      background: 'white', cursor: 'pointer', textAlign: 'left',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#2d7a4f'; e.currentTarget.style.background = '#f0fdf4'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#dde8e3'; e.currentTarget.style.background = 'white'; }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a1a' }}>{s.name}</div>
                      {s.description && <div style={{ fontSize: '0.82rem', color: '#888', marginTop: 2 }}>{s.description}</div>}
                      <div style={{ fontSize: '0.78rem', color: '#aaa', marginTop: 4 }}>선택지 {s.optionCount}개</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────── 컴포넌트: 일별 상세 패널 ──────────── */

function DayDetailPanel({ date, reservations, onClose, onReservationClick }: {
  date: Date;
  reservations: Reservation[];
  onClose: () => void;
  onReservationClick: (r: Reservation) => void;
}) {
  const dayLabel = `${date.getMonth() + 1}월 ${date.getDate()}일 (${DAY_LABELS[(date.getDay() + 6) % 7]})`;

  const grouped = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    reservations.forEach((r) => {
      const hour = r.time.split(':')[0] + ':00';
      if (!map[hour]) map[hour] = [];
      map[hour].push(r);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [reservations]);

  // 상태별 카운트
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    reservations.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return Object.entries(counts);
  }, [reservations]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: 400,
      height: '100vh',
      backgroundColor: '#fff',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.12)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideIn 0.2s ease-out',
    }}>
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>{dayLabel}</h3>
          <span style={{ fontSize: 13, color: '#6b7280' }}>총 {reservations.length}건</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 6,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            color: '#6b7280',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>

      {/* 상태 요약 */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {statusCounts.map(([status, count]) => {
          const st = getStatusStyle(status);
          return (
            <span key={status} style={{
              padding: '3px 10px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: st.bg,
              color: st.color,
            }}>
              {status} {count}
            </span>
          );
        })}
      </div>

      {/* 예약 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {reservations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
            예약이 없습니다
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {grouped.map(([hour, items]) => (
              <div key={hour}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#6b7280',
                  marginBottom: 6,
                }}>
                  {hour}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.map((r) => {
                    const st = getStatusStyle(r.status);
                    return (
                      <div
                        key={r.seq}
                        onClick={() => onReservationClick(r)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          borderLeft: '4px solid #4f46e5',
                          backgroundColor: '#fff',
                          transition: 'box-shadow 0.15s',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{r.time} {r.name}</span>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor: st.bg,
                            color: st.color,
                          }}>
                            {r.status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6b7280' }}>
                          <span style={{
                            padding: '1px 6px',
                            borderRadius: 4,
                            backgroundColor: '#eef2ff',
                            color: '#4f46e5',
                            fontWeight: 600,
                            fontSize: 11,
                          }}>
                            CALLER {r.caller}
                          </span>
                          <span>{r.phone}</span>
                        </div>
                        {r.memo && (
                          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                            {r.memo}
                          </div>
                        )}
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

/* ──────────── 메인 페이지 ──────────── */

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [reservationMap, setReservationMap] = useState<Record<string, Reservation[]>>({});
  const [loading, setLoading] = useState(true);
  const [statusModalReservation, setStatusModalReservation] = useState<Reservation | null>(null);

  const today = new Date();

  /** 현재 뷰에 필요한 날짜 범위 계산 */
  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      const week = getWeekDates(currentDate);
      return { start: formatDateKey(week[0]), end: formatDateKey(week[6]) };
    }
    const weeks = getMonthDates(currentDate.getFullYear(), currentDate.getMonth());
    const allDates = weeks.flat();
    return { start: formatDateKey(allDates[0]), end: formatDateKey(allDates[allDates.length - 1]) };
  }, [viewMode, currentDate]);

  /** API에서 예약 데이터 로드 */
  const loadReservations = useCallback(async () => {
    setLoading(true);
    const res = await calendarApi.getReservations(dateRange.start, dateRange.end);
    if (res.success) {
      setReservationMap(toReservationMap(res.data));
    }
    setLoading(false);
  }, [dateRange]);

  useEffect(() => { loadReservations(); }, [loadReservations]);

  const getReservations = (date: Date): Reservation[] => {
    return reservationMap[formatDateKey(date)] || [];
  };

  /* ── 네비게이션 ── */
  const navigatePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const navigateNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  /* ── 헤더 타이틀 ── */
  const headerTitle = viewMode === 'week'
    ? (() => {
        const week = getWeekDates(currentDate);
        const start = week[0];
        const end = week[6];
        if (start.getMonth() === end.getMonth()) {
          return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 — ${end.getDate()}일`;
        }
        return `${start.getMonth() + 1}월 ${start.getDate()}일 — ${end.getMonth() + 1}월 ${end.getDate()}일`;
      })()
    : `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;

  /* ── 주간 뷰 ── */
  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#fff',
      }}>
        {weekDates.map((date, i) => {
          const isT = isSameDay(date, today);
          const isSun = i === 6;
          const isSat = i === 5;
          return (
            <div key={i} style={{
              padding: '12px 8px',
              textAlign: 'center',
              borderRight: i < 6 ? '1px solid var(--border)' : 'none',
              borderBottom: '1px solid var(--border)',
              backgroundColor: isT ? '#eef2ff' : '#f9fafb',
            }}>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: isSun ? '#ef4444' : isSat ? '#3b82f6' : '#6b7280',
                marginBottom: 4,
              }}>
                {DAY_LABELS[i]}
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: isT ? 700 : 500,
                color: isT ? '#fff' : '#111827',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                backgroundColor: isT ? '#4f46e5' : 'transparent',
                margin: '0 auto',
              }}>
                {date.getDate()}
              </div>
            </div>
          );
        })}
        {weekDates.map((date, i) => {
          const reservations = getReservations(date);
          const isT = isSameDay(date, today);
          return (
            <div
              key={`body-${i}`}
              onClick={() => setSelectedDate(date)}
              style={{
                minHeight: 400,
                padding: 8,
                borderRight: i < 6 ? '1px solid var(--border)' : 'none',
                backgroundColor: isT ? '#fafaff' : '#fff',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#f5f5ff';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = isT ? '#fafaff' : '#fff';
              }}
            >
              {reservations.length > 0 && (
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#6b7280',
                  marginBottom: 6,
                  textAlign: 'center',
                }}>
                  {reservations.length}건
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {reservations.map((r) => (
                  <ReservationChip key={r.seq} r={r} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* ── 월간 뷰 ── */
  const renderMonthView = () => {
    const weeks = getMonthDates(currentDate.getFullYear(), currentDate.getMonth());
    return (
      <div style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#fff',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {DAY_LABELS.map((label, i) => (
            <div key={label} style={{
              padding: '10px 0',
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 600,
              color: i === 6 ? '#ef4444' : i === 5 ? '#3b82f6' : '#6b7280',
              borderRight: i < 6 ? '1px solid var(--border)' : 'none',
              borderBottom: '1px solid var(--border)',
              backgroundColor: '#f9fafb',
            }}>
              {label}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {week.map((date, di) => (
              <MonthDayCell
                key={di}
                date={date}
                reservations={getReservations(date)}
                isCurrentMonth={date.getMonth() === currentDate.getMonth()}
                isToday={isSameDay(date, today)}
                onSelect={setSelectedDate}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  /* ── 통계 ── */
  const allReservations = useMemo(() => Object.values(reservationMap).flat(), [reservationMap]);
  const totalReservations = allReservations.length;
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allReservations.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [allReservations]);

  const statusKeys = Object.keys(statusCounts);

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      <h2 className="page-title">상담 예약 캘린더</h2>

      {/* 통계 카드 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12,
        marginBottom: 20,
      }}>
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #4f46e5' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>전체 예약</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{totalReservations}</div>
        </div>
        {statusKeys.map((status) => {
          const st = getStatusStyle(status);
          return (
            <div key={status} className="card" style={{ padding: '16px 20px', borderLeft: `4px solid ${st.color}` }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{status}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: st.color }}>{statusCounts[status]}</div>
            </div>
          );
        })}
      </div>

      {/* 툴바 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={navigateToday}
            style={{
              padding: '6px 14px',
              border: '1px solid var(--border)',
              borderRadius: 6,
              backgroundColor: '#fff',
              color: '#374151',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            오늘
          </button>
          <button
            onClick={navigatePrev}
            style={{
              padding: '6px 10px',
              border: '1px solid var(--border)',
              borderRadius: 6,
              backgroundColor: '#fff',
              color: '#374151',
              fontSize: 14,
            }}
          >
            ‹
          </button>
          <button
            onClick={navigateNext}
            style={{
              padding: '6px 10px',
              border: '1px solid var(--border)',
              borderRadius: 6,
              backgroundColor: '#fff',
              color: '#374151',
              fontSize: 14,
            }}
          >
            ›
          </button>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 8px' }}>
            {headerTitle}
          </h3>
          {loading && (
            <span style={{ fontSize: 12, color: '#9ca3af' }}>불러오는 중...</span>
          )}
        </div>

        <div style={{
          display: 'flex',
          border: '1px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          {([['week', '주간'], ['month', '월간']] as const).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '6px 20px',
                border: 'none',
                borderRadius: 0,
                backgroundColor: viewMode === mode ? '#4f46e5' : '#fff',
                color: viewMode === mode ? '#fff' : '#374151',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
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
          <div
            onClick={() => setSelectedDate(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0,0,0,0.3)',
              zIndex: 999,
            }}
          />
          <DayDetailPanel
            date={selectedDate}
            reservations={getReservations(selectedDate)}
            onClose={() => setSelectedDate(null)}
            onReservationClick={(r) => setStatusModalReservation(r)}
          />
        </>
      )}

      {/* 예약 상태 변경 모달 */}
      {statusModalReservation && (
        <ReservationStatusModal
          reservation={statusModalReservation}
          onClose={() => setStatusModalReservation(null)}
          onStatusChanged={() => loadReservations()}
        />
      )}
    </>
  );
}