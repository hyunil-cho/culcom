'use client';

import { useState } from 'react';
import { useDragReorder } from '@/hooks/useDragReorder';
import { useRouter } from 'next/navigation';
import { attendanceViewApi, type AttendanceViewSlot, type AttendanceViewMember } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { invalidateAll, ATTENDANCE_RELATED } from '@/lib/invalidate';
import { useSessionStore } from '@/lib/store';
import { ROUTES } from '@/lib/routes';
import { useHighlightSearch } from '@/lib/useHighlightSearch';
import HighlightSearchBar from '@/components/ui/HighlightSearchBar';
import { useMessageModal } from '../hooks/useMessageModal';
import { useBulkAttendance } from './components/BulkAttendanceModal';
import { calcTodayRate, RateBadge } from './components/AttendanceRateBadge';
import { MessageButton } from './components/MessageButton';
import MemberManageModal from './components/MemberManageModal';
import { useModal } from '@/hooks/useModal';
import Spinner from '@/components/ui/Spinner';
import './attendance.css';

export default function AttendancePage() {
  const router = useRouter();

  // 지점이 바뀌면 query key가 달라져 이전 지점의 캐시가 재사용되지 않는다.
  // (헤더에서 지점 변경 시 reload 되지만, SPA 라우팅 도중 보호 장치로 유지)
  const branchSeq = useSessionStore((s) => s.session?.selectedBranchSeq ?? null);

  const { data: slots = [], isLoading: loading } = useApiQuery<AttendanceViewSlot[]>(
    ['attendanceView', branchSeq],
    () => attendanceViewApi.getView(),
    { refetchOnMount: 'always' },
  );

  // 출석 변경은 잔여 횟수(멤버십)·대시보드 위젯에도 영향을 주므로 연관 키까지 묶어서 무효화.
  const invalidate = () => invalidateAll(ATTENDANCE_RELATED);

  // 드래그 정렬 실패 시 서버 상태로 UI를 되돌리기 위한 공통 처리.
  const handleReorderError = (kind: '분반' | '멤버', message?: string) => {
    alert(`${kind} 순서 변경에 실패했습니다.${message ? `\n사유: ${message}` : ''}\n최신 상태로 되돌립니다.`);
    invalidate();
  };

  const { matchedItems, currentMatchIndex, performSearch, navigateMatch } = useHighlightSearch({
    rowSelector: '.member-item',
    nameSelector: '.member-name',
    phoneSelector: '.member-phone',
    highlightClass: 'member-highlight',
    activeHighlightClass: 'member-active-highlight',
  });

  const msgModal = useMessageModal();

  const bulkAttendance = useBulkAttendance(invalidate);

  const manageModal = useModal<{ member: AttendanceViewMember; className: string }>();

  const { start: startCardDrag } = useDragReorder({
    itemSelector: '.class-card',
    getItemId: (el) => {
      const id = parseInt(el.dataset.classId || '0');
      return id || null;
    },
    onReorder: async (ids) => {
      const classOrders = ids.map((id, idx) => ({ id: Number(id), sortOrder: idx }));
      try {
        const res = await attendanceViewApi.reorderClasses(classOrders);
        if (!res.success) handleReorderError('분반', res.message);
      } catch (e) {
        handleReorderError('분반', e instanceof Error ? e.message : undefined);
      }
    },
  });

  const { start: startMemberDrag } = useDragReorder({
    itemSelector: '.member-item',
    getItemId: (el) => {
      const id = parseInt(el.dataset.memberSeq || '0');
      return id || null;
    },
    onReorder: async (ids, container) => {
      const classSeq = parseInt(container.dataset.classSeq || '0');
      if (!classSeq) return;
      const memberOrders = ids.map((id, idx) => ({ memberSeq: Number(id), sortOrder: idx }));
      try {
        const res = await attendanceViewApi.reorderMembers(classSeq, memberOrders);
        if (!res.success) handleReorderError('멤버', res.message);
      } catch (e) {
        handleReorderError('멤버', e instanceof Error ? e.message : undefined);
      }
    },
  });

  if (loading) return <Spinner />;

  return (
    <>
      <div className="complex-container">
        <h1 className="complex-title">팀 현황 관리</h1>

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
              {slot.classes.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: '0.9rem', border: '1px dashed #ddd', borderRadius: 6, background: '#fafafa' }}>
                  등록된 분반이 없습니다.
                </div>
              )}
              {slot.classes.map(cls => {
                const rate = calcTodayRate(cls.members);
                return (
                  <div key={cls.classSeq} className="class-card" data-class-id={cls.classSeq}
                    onPointerDown={e => {
                      const card = e.currentTarget as HTMLElement;
                      if ((e.target as HTMLElement).closest('.class-card-header') && !(e.target as HTMLElement).closest('button, a'))
                        startCardDrag(e, card, card.parentElement!);
                    }}>
                    <div className="class-card-header">
                      <h3>{cls.name}</h3>
                      <RateBadge rate={rate} />
                      <button type="button" className="btn-bulk-attend" onClick={() => bulkAttendance.open(cls)}>일괄 출석</button>
                    </div>
                    <ul className="member-list" data-class-seq={cls.classSeq}>
                      {cls.members.map((m, i) => (
                        <li key={`${m.memberSeq}-${i}`}
                          data-member-seq={m.memberSeq}
                          onPointerDown={e => {
                            if (m.staff) return;
                            const li = e.currentTarget as HTMLElement;
                            startMemberDrag(e, li, li.parentElement!);
                          }}
                          className={`member-item ${m.postponed ? 'is-postponed' : ''} ${m.staff ? 'is-staff' : ''} ${m.noMembership ? 'is-no-membership' : ''}`}>
                          <div className="member-info">
                            <span className="member-index" style={m.staff ? { fontWeight: 800, color: '#e67e22', fontSize: '0.7rem' } : {}}>
                              {m.staff ? 'STAFF' : i}
                            </span>
                            <span className="member-name">{m.name}</span>
                            <span className="member-phone">{m.phoneNumber}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button onClick={(e) => { e.stopPropagation(); manageModal.open({ member: m, className: cls.name }); }}
                              style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 3, padding: '2px 6px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>
                              관리
                            </button>
                            {m.postponed ? (
                              <div className="status-mark postponed" title="수업 연기 중">△</div>
                            ) : m.noMembership ? (
                              <div className="status-mark no-membership" title="활성 멤버십 없음 — 출석 불가">!</div>
                            ) : (() => {
                              const today = new Date().toISOString().slice(0, 10);
                              const isStale = !!m.attendanceDate && m.attendanceDate !== today;
                              const statusClass = m.status === 'O' ? 'active' : m.status === 'X' ? '' : 'absent';
                              return (
                                <div
                                  className={`status-mark ${statusClass}${isStale ? ' is-stale' : ''}`}
                                  title={m.attendanceDate
                                    ? (isStale ? `${m.attendanceDate} 기록 (오늘 아님)` : '오늘 기록')
                                    : undefined}
                                >
                                  {m.status || '-'}
                                </div>
                              );
                            })()}
                          </div>
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

      {manageModal.isOpen && (
        <MemberManageModal
          member={manageModal.data!.member}
          currentClassName={manageModal.data!.className}
          onClose={manageModal.close}
          onMoved={() => { manageModal.close(); invalidate(); }}
        />
      )}
      {bulkAttendance.rendered}
      {msgModal.rendered}
    </>
  );
}
