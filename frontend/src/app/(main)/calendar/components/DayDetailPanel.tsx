'use client';

import { useState, useMemo } from 'react';
import { type Reservation, type CalendarEventItem, DAY_LABELS, getStatusStyle, formatDateKey } from '../utils';
import { calendarApi, type CalendarEventRequest } from '@/lib/api';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useModal } from '@/hooks/useModal';
import { queryClient } from '@/lib/queryClient';
import ConfirmModal from '@/components/ui/ConfirmModal';
import s from './calendar.module.css';

export default function DayDetailPanel({ date, reservations, events, onClose, onReservationClick }: {
  date: Date;
  reservations: Reservation[];
  events: CalendarEventItem[];
  onClose: () => void;
  onReservationClick: (r: Reservation) => void;
}) {
  const dayLabel = `${date.getMonth() + 1}월 ${date.getDate()}일 (${DAY_LABELS[(date.getDay() + 6) % 7]})`;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', author: '', startTime: '09:00', endTime: '10:00' });
  const deleteEventModal = useModal<number>();

  const invalidateEvents = () => queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });

  const createMutation = useApiMutation<unknown, CalendarEventRequest>(
    (data) => calendarApi.createEvent(data),
    {
      onSuccess: () => {
        setForm({ title: '', content: '', author: '', startTime: '09:00', endTime: '10:00' });
        setShowForm(false);
        invalidateEvents();
      },
      onError: (err) => alert(err.message),
    },
  );

  const deleteMutation = useApiMutation<void, number>(
    (seq) => calendarApi.deleteEvent(seq),
    {
      onSuccess: () => invalidateEvents(),
      onError: (err) => alert(err.message),
    },
  );

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

  const timeError = form.startTime && form.endTime && form.endTime <= form.startTime
    ? '종료 시간은 시작 시간보다 이후여야 합니다' : '';

  const handleSubmit = () => {
    if (!form.title.trim() || !form.author.trim()) return;
    if (timeError) return;
    createMutation.mutate({
      title: form.title,
      content: form.content || undefined,
      author: form.author,
      eventDate: formatDateKey(date),
      startTime: form.startTime,
      endTime: form.endTime,
    });
  };

  const handleDelete = (seq: number) => {
    deleteEventModal.open(seq);
  };

  const confirmDelete = () => {
    if (!deleteEventModal.data) return;
    const seq = deleteEventModal.data;
    deleteEventModal.close();
    deleteMutation.mutate(seq);
  };

  return (
    <div className={s.panel}>
      <div className={s.panelHeader}>
        <div>
          <h3 className={s.panelTitle}>{dayLabel}</h3>
          <span className={s.panelSubtitle}>예약 {reservations.length}건 · 일정 {events.length}건</span>
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
        {/* 일정 추가 버튼 / 폼 */}
        {!showForm ? (
          <button onClick={() => setShowForm(true)} className={s.addEventBtn}>+ 일정 추가</button>
        ) : (
          <div className={s.eventForm}>
            <div className={s.eventFormTitle}>일정 추가</div>
            <input type="text" placeholder="제목 *" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={s.eventFormInput} />
            <textarea placeholder="상세 내용" value={form.content} rows={2}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className={s.eventFormTextarea} />
            <input type="text" placeholder="작성자 *" value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
              className={s.eventFormInput} />
            <div className={s.eventFormTimeRow}>
              <label className={s.eventFormTimeLabel}>
                시작
                <input type="time" value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className={s.eventFormTimeInput} />
              </label>
              <label className={s.eventFormTimeLabel}>
                종료
                <input type="time" value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className={s.eventFormTimeInput} />
              </label>
            </div>
            {timeError && <div style={{ color: '#e03131', fontSize: '13px' }}>{timeError}</div>}
            <div className={s.eventFormActions}>
              <button onClick={() => setShowForm(false)} className={s.eventFormCancelBtn}>취소</button>
              <button onClick={handleSubmit}
                disabled={createMutation.isPending || !form.title.trim() || !form.author.trim() || !!timeError}
                className={s.eventFormSaveBtn}>
                {createMutation.isPending ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        )}

        {/* 일정 목록 */}
        {events.length > 0 && (
          <div className={s.eventSection}>
            <div className={s.eventSectionLabel}>일정</div>
            <div className={s.panelHourItems}>
              {events.map((ev) => (
                <div key={ev.seq} className={s.eventItem}>
                  <div className={s.eventItemHeader}>
                    <span className={s.eventItemTime}>{ev.startTime} — {ev.endTime}</span>
                    <button onClick={() => handleDelete(ev.seq)} className={s.eventDeleteBtn}>×</button>
                  </div>
                  <div className={s.eventItemTitle}>{ev.title}</div>
                  {ev.content && <div className={s.eventItemContent}>{ev.content}</div>}
                  <div className={s.eventItemAuthor}>{ev.author}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 예약 목록 */}
        {reservations.length === 0 && events.length === 0 ? (
          <div className={s.panelEmpty}>예약 및 일정이 없습니다</div>
        ) : reservations.length > 0 && (
          <div className={s.panelGroup}>
            {events.length > 0 && <div className={s.eventSectionLabel}>예약</div>}
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

      {deleteEventModal.isOpen && (
        <ConfirmModal
          title="삭제 확인"
          confirmLabel="삭제"
          confirmColor="#e03131"
          onCancel={deleteEventModal.close}
          onConfirm={confirmDelete}
        >
          일정을 삭제하시겠습니까?
        </ConfirmModal>
      )}
    </div>
  );
}
