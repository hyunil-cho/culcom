'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  attendanceViewApi,
  AttendanceViewSlot,
  AttendanceViewClass,
  AttendanceViewMember,
  BulkAttendanceResult,
} from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useHighlightSearch, rateBadgeClass } from '@/lib/useHighlightSearch';
import HighlightSearchBar from '@/components/ui/HighlightSearchBar';

export default function AttendancePage() {
  const router = useRouter();
  const [slots, setSlots] = useState<AttendanceViewSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // 검색
  const { matchedItems, currentMatchIndex, performSearch, navigateMatch } = useHighlightSearch({
    rowSelector: '.member-item',
    nameSelector: '.member-name',
    phoneSelector: '.member-phone',
    highlightClass: 'member-highlight',
    activeHighlightClass: 'member-active-highlight',
  });

  // 일괄출석 모달
  const [bulkModal, setBulkModal] = useState<{ classSeq: number; className: string; members: AttendanceViewMember[] } | null>(null);
  const [bulkChecked, setBulkChecked] = useState<Record<number, boolean>>({});
  const [bulkResultModal, setBulkResultModal] = useState<{ className: string; results: BulkAttendanceResult[] } | null>(null);

  // 카드 드래그
  const dragRef = useRef<{
    el: HTMLElement;
    grid: HTMLElement;
    clone: HTMLElement;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const fetchData = useCallback(async () => {
    const res = await attendanceViewApi.getView();
    if (res.success) setSlots(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 출석률 계산
  const calcRate = (members: AttendanceViewMember[]) => {
    let total = 0, present = 0, postponed = 0;
    members.forEach(m => {
      if (m.postponed) { postponed++; return; }
      total++;
      if (m.status === 'O') present++;
    });
    const pct = total > 0 ? Math.round(present / total * 100) : 0;
    const suffix = postponed > 0 ? ` (연기 ${postponed})` : '';
    return { text: `${present}/${total}명 · ${pct}%${suffix}`, pct };
  };

  // 일괄출석 모달 열기
  const openBulkModal = (cls: AttendanceViewClass) => {
    const checked: Record<number, boolean> = {};
    cls.members.forEach(m => {
      if (!m.postponed) checked[m.memberSeq] = m.status === 'O';
    });
    setBulkChecked(checked);
    setBulkModal({ classSeq: cls.classSeq, className: cls.name, members: cls.members });
  };

  // 일괄출석 저장
  const saveBulkAttendance = async () => {
    if (!bulkModal) return;
    const members = bulkModal.members.map(m => ({
      memberSeq: m.memberSeq,
      staff: m.staff,
      attended: m.postponed ? false : (bulkChecked[m.memberSeq] ?? false),
    }));

    const res = await attendanceViewApi.bulkAttendance(bulkModal.classSeq, members);
    if (res.success) {
      setBulkResultModal({ className: bulkModal.className, results: res.data });
      setBulkModal(null);
      fetchData();
    }
  };

  // 카드 드래그 핸들러
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
        const midX = r.left + r.width / 2;
        if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) {
          if (e.clientX < midX) grid.insertBefore(el, sib);
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

      const cards = grid.querySelectorAll('.class-card');
      const classOrders: { id: number; sortOrder: number }[] = [];
      cards.forEach((card, idx) => {
        const id = parseInt((card as HTMLElement).dataset.classId || '0');
        if (id) classOrders.push({ id, sortOrder: idx });
      });
      if (classOrders.length > 0) {
        attendanceViewApi.reorderClasses(classOrders);
      }
      dragRef.current = null;
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };
  }, []);

  if (loading) return <div style={{ padding: 20 }}>로딩 중...</div>;

  return (
    <>
      <style>{`
        .complex-container { padding: 20px; background: #f4f7f6; min-height: 100vh; }
        .complex-title { text-align: center; color: #4a90e2; margin-bottom: 20px; font-size: 2rem; font-weight: bold; }
        .slot-section { margin-bottom: 50px; background: #fff; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .slot-header { border-left: 5px solid #4a90e2; padding-left: 15px; margin-bottom: 25px; display: flex; align-items: center; justify-content: space-between; }
        .slot-header h2 { margin: 0; color: #333; font-size: 1.5rem; }
        .complex-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; align-items: start; }
        .class-card { background: #fff; border: 1px solid #dee2e6; border-radius: 8px; display: flex; flex-direction: column; transition: transform 0.2s; }
        .class-card:hover { transform: translateY(-5px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .class-card-header { background: #f8f9fa; padding: 12px 15px; border-bottom: 1px solid #dee2e6; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; cursor: grab; }
        .class-card-header h3 { margin: 0; font-size: 1.1rem; color: #4a90e2; font-weight: 700; }
        .member-list { list-style: none; padding: 0; margin: 0; }
        .member-item { padding: 10px 15px; border-bottom: 1px solid #f1f3f5; display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; }
        .member-info { display: flex; gap: 10px; align-items: center; flex: 1; }
        .member-index { color: #adb5bd; font-size: 0.8rem; width: 38px; }
        .member-name { font-weight: 600; color: #495057; }
        .member-phone { color: #999; font-size: 0.85rem; }
        .status-mark { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border: 1px solid #dee2e6; border-radius: 50%; font-weight: bold; font-size: 0.8rem; background: #fff; }
        .status-mark.active { background: #4a90e2; color: white; border-color: #4a90e2; }
        .status-mark.postponed { background: #fff9db; color: #e67700; border-color: #ffc078; font-size: 0.9rem; }
        .status-mark.absent { background: #fff5f5; color: #ccc; border-color: #eee; font-size: 0.75rem; }
        .member-item.is-staff { background: #fff8f0; border-bottom: 2px solid #f0c78a; }
        .member-item.is-postponed { background: #fff3cd; }
        .member-item.is-postponed .member-name { color: #b8860b; }
        .card-footer { padding: 12px 15px; background: #fdfdfd; border-top: 1px solid #eee; border-radius: 0 0 8px 8px; font-size: 0.85rem; color: #666; display: flex; justify-content: space-between; align-items: center; }
        .attend-rate-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; white-space: nowrap; background: #e9ecef; color: #868e96; border: 1px solid #dee2e6; }
        .attend-rate-badge::before { content: ''; display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: currentColor; opacity: 0.7; }
        .rate-high { background: #ebfbee; color: #2b8a3e; border-color: #b2f2bb; }
        .rate-mid { background: #fff9db; color: #e67700; border-color: #ffec99; }
        .rate-low { background: #fff5f5; color: #c92a2a; border-color: #ffa8a8; }
        .btn-bulk-attend { background: #fff; color: #2e7d32; border: 1px solid #2e7d32; padding: 2px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .btn-bulk-attend:hover { background: #2e7d32; color: white; }
        .member-highlight { background-color: #fff9c4 !important; transition: background-color 0.3s ease; }
        .member-active-highlight { background-color: #ffd600 !important; outline: 2px solid #fbc02d; z-index: 1; transition: all 0.2s ease; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; }
        .modal-content { background: white; border-radius: 12px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.2); overflow: hidden; }
        .modal-header { padding: 1rem 1.5rem; border-bottom: 2px solid; display: flex; justify-content: space-between; align-items: center; }
        .modal-header h3 { margin: 0; font-size: 1.1rem; color: #fff; }
        .modal-body { max-height: 60vh; overflow-y: auto; }
        .modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #e0e0e0; display: flex; gap: 10px; justify-content: flex-end; }
      `}</style>

      <div className="complex-container">
        <h1 className="complex-title">지점 통합 등록현황</h1>

        {/* 검색 바 */}
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
                <a
                  href="#"
                  onClick={e => { e.preventDefault(); router.push(ROUTES.COMPLEX_ATTENDANCE_DETAIL(slot.timeSlotSeq)); }}
                  style={{ textDecoration: 'none', padding: '5px 12px', fontSize: '0.85rem', background: '#4a90e2', color: 'white', borderRadius: 4, fontWeight: 600 }}
                >전체 상세보기</a>
              </div>
            </div>

            <div className="complex-grid" ref={el => { /* grid ref for drag */ }}>
              {slot.classes.map(cls => {
                const rate = calcRate(cls.members);
                return (
                  <div key={cls.classSeq} className="class-card" data-class-id={cls.classSeq}
                    onPointerDown={e => {
                      const card = (e.currentTarget as HTMLElement);
                      const grid = card.parentElement!;
                      if ((e.target as HTMLElement).closest('.class-card-header') && !(e.target as HTMLElement).closest('button, a')) {
                        handleCardPointerDown(e, card, grid);
                      }
                    }}>
                    <div className="class-card-header">
                      <h3>{cls.name}</h3>
                      <span className={`attend-rate-badge ${rateBadgeClass(rate.pct)}`}>{rate.text}</span>
                      <button type="button" className="btn-bulk-attend" onClick={() => openBulkModal(cls)}>일괄 출석</button>
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

      {/* 일괄출석 모달 */}
      {bulkModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setBulkModal(null)}>
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <div className="modal-header" style={{ background: '#2e7d32', borderColor: '#2e7d32' }}>
              <h3>{bulkModal.className} — 일괄 출석</h3>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #e8f5e9', background: '#f9fdf9' }}>
                <span style={{ fontSize: '0.82rem', color: '#555' }}>총 <strong>{bulkModal.members.length}</strong>명</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" onClick={() => {
                    const next: Record<number, boolean> = {};
                    bulkModal.members.forEach(m => { if (!m.postponed) next[m.memberSeq] = true; });
                    setBulkChecked(next);
                  }} style={{ fontSize: '0.75rem', padding: '3px 10px', border: '1px solid #2e7d32', borderRadius: 4, background: 'white', color: '#2e7d32', cursor: 'pointer', fontWeight: 700 }}>전체 출석</button>
                  <button type="button" onClick={() => {
                    const next: Record<number, boolean> = {};
                    bulkModal.members.forEach(m => { if (!m.postponed) next[m.memberSeq] = false; });
                    setBulkChecked(next);
                  }} style={{ fontSize: '0.75rem', padding: '3px 10px', border: '1px solid #ccc', borderRadius: 4, background: 'white', color: '#888', cursor: 'pointer', fontWeight: 600 }}>전체 해제</button>
                </div>
              </div>
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {bulkModal.members.map((m, i) => {
                  const label = m.staff
                    ? <span style={{ color: '#e67e22', fontSize: '0.72rem', fontWeight: 800, whiteSpace: 'nowrap' }}>STAFF</span>
                    : <span style={{ color: '#adb5bd', fontSize: '0.8rem', width: 18, textAlign: 'right', flexShrink: 0 }}>{i}</span>;

                  if (m.postponed) {
                    return (
                      <div key={m.memberSeq} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid #f0f0f0', background: '#fffdf5', opacity: 0.75 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 17, height: 17, background: '#fff9db', border: '1px solid #ffc078', borderRadius: 3, color: '#e67700', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>△</span>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          {label}
                          <strong style={{ color: '#b8860b', whiteSpace: 'nowrap' }}>{m.name}</strong>
                          <span style={{ color: '#999', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.phoneNumber}</span>
                          <span style={{ fontSize: '0.7rem', color: '#e67700', background: '#fff3cd', padding: '1px 6px', borderRadius: 10, whiteSpace: 'nowrap' }}>연기중</span>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={m.memberSeq} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid #f0f0f0', ...(m.staff ? { background: '#fff8f0' } : {}) }}>
                      <input type="checkbox" checked={bulkChecked[m.memberSeq] ?? false}
                        onChange={e => setBulkChecked(prev => ({ ...prev, [m.memberSeq]: e.target.checked }))}
                        style={{ width: 17, height: 17, cursor: 'pointer', accentColor: '#2e7d32' }} />
                      <label style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        {label}
                        <strong style={{ color: '#333', whiteSpace: 'nowrap' }}>{m.name}</strong>
                        <span style={{ color: '#999', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.phoneNumber}</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setBulkModal(null)} style={{ padding: '8px 20px', border: '1px solid #ccc', borderRadius: 6, background: 'white', cursor: 'pointer' }}>취소</button>
              <button onClick={saveBulkAttendance} style={{ padding: '8px 20px', border: 'none', borderRadius: 6, background: '#2e7d32', color: 'white', cursor: 'pointer', fontWeight: 600 }}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 일괄출석 결과 모달 */}
      {bulkResultModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setBulkResultModal(null)}>
          <div className="modal-content" style={{ maxWidth: 400 }}>
            <div className="modal-header" style={{ background: '#2e7d32', borderColor: '#2e7d32' }}>
              <h3>{bulkResultModal.className} — 출석 처리 결과</h3>
            </div>
            <div className="modal-body" style={{ padding: 10 }}>
              <div style={{ padding: 10, fontSize: '0.9rem', lineHeight: 1.8 }}>
                {(() => {
                  const r = bulkResultModal.results;
                  const attended = r.filter(x => x.status === '출석');
                  const absent = r.filter(x => x.status === '결석');
                  const postponed = r.filter(x => x.status === '연기');
                  const skipped = r.filter(x => x.status === 'skip_already');
                  const noMembership = r.filter(x => x.status === 'skip_no_membership');
                  return (
                    <>
                      {attended.length > 0 && <div style={{ marginBottom: 10 }}><strong style={{ color: '#2e7d32' }}>출석 ({attended.length}명)</strong><br />{attended.map(x => x.name).join(', ')}</div>}
                      {absent.length > 0 && <div style={{ marginBottom: 10 }}><strong style={{ color: '#888' }}>결석 ({absent.length}명)</strong><br />{absent.map(x => x.name).join(', ')}</div>}
                      {postponed.length > 0 && <div style={{ marginBottom: 10 }}><strong style={{ color: '#e67700' }}>연기 ({postponed.length}명)</strong><br />{postponed.map(x => x.name).join(', ')}</div>}
                      {skipped.length > 0 && <div style={{ marginBottom: 10, color: '#999' }}><strong>이미 처리됨 ({skipped.length}명)</strong><br />{skipped.map(x => x.name).join(', ')}</div>}
                      {noMembership.length > 0 && <div style={{ marginBottom: 10, color: '#c92a2a' }}><strong>멤버십 없음 ({noMembership.length}명)</strong><br />{noMembership.map(x => x.name).join(', ')}</div>}
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setBulkResultModal(null)} style={{ padding: '8px 20px', border: 'none', borderRadius: 6, background: '#2e7d32', color: 'white', cursor: 'pointer', fontWeight: 600 }}>확인</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
