'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { attendanceViewApi, AttendanceViewSlot } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useHighlightSearch } from '@/lib/useHighlightSearch';
import HighlightSearchBar from '@/components/ui/HighlightSearchBar';
import { useMessageModal } from '../hooks/useMessageModal';
import { useBulkAttendance } from './components/BulkAttendanceModal';
import { calcTodayRate, RateBadge } from './components/AttendanceRateBadge';
import { MessageButton } from './components/MessageButton';
import './attendance.css';

export default function AttendancePage() {
  const router = useRouter();
  const [slots, setSlots] = useState<AttendanceViewSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const { matchedItems, currentMatchIndex, performSearch, navigateMatch } = useHighlightSearch({
    rowSelector: '.member-item',
    nameSelector: '.member-name',
    phoneSelector: '.member-phone',
    highlightClass: 'member-highlight',
    activeHighlightClass: 'member-active-highlight',
  });

  const msgModal = useMessageModal();

  const fetchData = useCallback(async () => {
    const res = await attendanceViewApi.getView();
    if (res.success) setSlots(res.data);
    setLoading(false);
  }, []);

  const bulkAttendance = useBulkAttendance(fetchData);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 카드 드래그
  const dragRef = useRef<{
    el: HTMLElement; grid: HTMLElement; clone: HTMLElement;
    offsetX: number; offsetY: number;
  } | null>(null);

  const handleCardPointerDown = (e: React.PointerEvent, card: HTMLElement, grid: HTMLElement) => {
    if ((e.target as HTMLElement).closest('button, a, input')) return;
    e.preventDefault();
    const rect = card.getBoundingClientRect();
    const clone = card.cloneNode(true) as HTMLElement;
    clone.style.cssText = `position:fixed;pointer-events:none;z-index:10000;opacity:0.9;box-shadow:0 12px 32px rgba(74,144,226,0.3);border-radius:8px;transform:rotate(2deg);width:${rect.width}px;height:${rect.height}px;left:${rect.left}px;top:${rect.top}px;overflow:hidden;`;
    document.body.appendChild(clone);
    card.style.opacity = '0.3';
    card.style.border = '2px dashed #4a90e2';
    dragRef.current = { el: card, grid, clone, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
    document.body.style.cursor = 'grabbing';
  };

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();
      const { clone, offsetX, offsetY, grid, el } = dragRef.current;
      clone.style.left = (e.clientX - offsetX) + 'px';
      clone.style.top = (e.clientY - offsetY) + 'px';
      const siblings = Array.from(grid.querySelectorAll('.class-card')) as HTMLElement[];
      for (const sib of siblings) {
        if (sib === el) continue;
        const r = sib.getBoundingClientRect();
        if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) {
          if (e.clientX < r.left + r.width / 2) grid.insertBefore(el, sib);
          else grid.insertBefore(el, sib.nextSibling);
          break;
        }
      }
    };
    const handleUp = () => {
      if (!dragRef.current) return;
      const { el, clone, grid } = dragRef.current;
      clone.remove();
      el.style.opacity = '';
      el.style.border = '';
      document.body.style.cursor = '';
      const classOrders: { id: number; sortOrder: number }[] = [];
      grid.querySelectorAll('.class-card').forEach((card, idx) => {
        const id = parseInt((card as HTMLElement).dataset.classId || '0');
        if (id) classOrders.push({ id, sortOrder: idx });
      });
      if (classOrders.length > 0) attendanceViewApi.reorderClasses(classOrders);
      dragRef.current = null;
    };
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    return () => { document.removeEventListener('pointermove', handleMove); document.removeEventListener('pointerup', handleUp); };
  }, []);

  if (loading) return <div style={{ padding: 20 }}>로딩 중...</div>;

  return (
    <>
      <div className="complex-container">
        <h1 className="complex-title">지점 통합 등록현황</h1>

        <HighlightSearchBar
          onSearch={performSearch}
          matchCount={matchedItems.length}
          currentIndex={currentMatchIndex}
          onNavigate={navigateMatch}
        />

        {slots.map(slot => (
          <section key={slot.timeSlotSeq} className="slot-section">
            <div className="slot-header">
              <h2>{slot.slotName}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#888', marginRight: 5 }}>총 {slot.classes.length}개 분반</span>
                <MessageButton onClick={() => {
                  const allMembers = slot.classes.flatMap(cls => cls.members);
                  msgModal.open(slot.slotName, allMembers);
                }} />
                <a href="#"
                  onClick={e => { e.preventDefault(); router.push(ROUTES.COMPLEX_ATTENDANCE_DETAIL(slot.timeSlotSeq)); }}
                  style={{ textDecoration: 'none', padding: '5px 12px', fontSize: '0.85rem', background: '#4a90e2', color: 'white', borderRadius: 4, fontWeight: 600 }}
                >전체 상세보기</a>
              </div>
            </div>

            <div className="complex-grid" ref={() => {}}>
              {slot.classes.map(cls => {
                const rate = calcTodayRate(cls.members);
                return (
                  <div key={cls.classSeq} className="class-card" data-class-id={cls.classSeq}
                    onPointerDown={e => {
                      const card = e.currentTarget as HTMLElement;
                      if ((e.target as HTMLElement).closest('.class-card-header') && !(e.target as HTMLElement).closest('button, a'))
                        handleCardPointerDown(e, card, card.parentElement!);
                    }}>
                    <div className="class-card-header">
                      <h3>{cls.name}</h3>
                      <RateBadge rate={rate} />
                      <button type="button" className="btn-bulk-attend" onClick={() => bulkAttendance.open(cls)}>일괄 출석</button>
                    </div>
                    <ul className="member-list">
                      {cls.members.map((m, i) => (
                        <li key={`${m.memberSeq}-${i}`}
                          className={`member-item ${m.postponed ? 'is-postponed' : ''} ${m.staff ? 'is-staff' : ''}`}>
                          <div className="member-info">
                            <span className="member-index" style={m.staff ? { fontWeight: 800, color: '#e67e22', fontSize: '0.7rem' } : {}}>
                              {m.staff ? 'STAFF' : i}
                            </span>
                            <span className="member-name">{m.name}</span>
                            <span className="member-phone">{m.phoneNumber}</span>
                          </div>
                          {m.postponed ? (
                            <div className="status-mark postponed" title="수업 연기 중">△</div>
                          ) : (
                            <div className={`status-mark ${m.status === 'O' ? 'active' : m.status === 'X' ? '' : 'absent'}`}>
                              {m.status || '-'}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                    <div className="card-footer">
                      <strong>인원: {cls.members.length} / {cls.capacity}명</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {slots.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>등록된 수업이 없습니다.</div>
        )}
      </div>

      {bulkAttendance.rendered}
      {msgModal.rendered}
    </>
  );
}
