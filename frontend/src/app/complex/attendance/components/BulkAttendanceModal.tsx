'use client';

import { useState } from 'react';
import { attendanceViewApi, AttendanceViewClass, AttendanceViewMember, BulkAttendanceResult } from '@/lib/api';
import ModalOverlay from '@/components/ui/ModalOverlay';
import s from './BulkAttendanceModal.module.css';

export function useBulkAttendance(onComplete: () => void) {
  const [bulkModal, setBulkModal] = useState<{ classSeq: number; className: string; members: AttendanceViewMember[] } | null>(null);
  const [bulkChecked, setBulkChecked] = useState<Record<number, boolean>>({});
  const [resultModal, setResultModal] = useState<{ className: string; results: BulkAttendanceResult[] } | null>(null);

  const open = (cls: AttendanceViewClass) => {
    // 체크박스 초기값은 "오늘자 출석" 기록만 반영한다.
    // attendanceDate가 오늘이 아닌(=지난 7일 내 과거) 기록은 무시 — 새 출석 체크에 영향을 주면 안 됨.
    const today = new Date().toISOString().slice(0, 10);
    const checked: Record<number, boolean> = {};
    cls.members.forEach(m => {
      if (m.postponed || m.noMembership) return;
      const isToday = m.attendanceDate === today;
      checked[m.memberSeq] = isToday && m.status === 'O';
    });
    setBulkChecked(checked);
    setBulkModal({ classSeq: cls.classSeq, className: cls.name, members: cls.members });
  };

  const save = async () => {
    if (!bulkModal) return;
    const members = bulkModal.members
      // 멤버십 없음/연기 중인 회원은 일괄 출석 페이로드에서 제외 (서버 부하 절감 + 의도 명확화)
      .filter(m => !m.noMembership)
      .map(m => ({
        memberSeq: m.memberSeq,
        staff: m.staff,
        attended: m.postponed ? false : (bulkChecked[m.memberSeq] ?? false),
      }));
    const res = await attendanceViewApi.bulkAttendance(bulkModal.classSeq, members);
    if (res.success) {
      setResultModal({ className: bulkModal.className, results: res.data });
      setBulkModal(null);
      onComplete();
    }
  };

  const rendered = (
    <>
      {bulkModal && (
        <ModalOverlay size="md" onClose={() => setBulkModal(null)}>
            <div className={`modal-header ${s.headerGreen}`}>
              <h3>{bulkModal.className} — 일괄 출석</h3>
            </div>
            <div className="modal-body">
              <div className={s.toolbar}>
                <span className={s.toolbarCount}>총 <strong>{bulkModal.members.length}</strong>명</span>
                <div className={s.toolbarBtns}>
                  <button type="button" onClick={() => {
                    const next: Record<number, boolean> = {};
                    bulkModal.members.forEach(m => { if (!m.postponed && !m.noMembership) next[m.memberSeq] = true; });
                    setBulkChecked(next);
                  }} className={s.selectAllBtn}>전체 출석</button>
                  <button type="button" onClick={() => {
                    const next: Record<number, boolean> = {};
                    bulkModal.members.forEach(m => { if (!m.postponed && !m.noMembership) next[m.memberSeq] = false; });
                    setBulkChecked(next);
                  }} className={s.deselectAllBtn}>전체 해제</button>
                </div>
              </div>
              <div className={s.scrollArea}>
                {bulkModal.members.map((m, i) => {
                  const label = m.staff
                    ? <span className={s.staffLabel}>STAFF</span>
                    : <span className={s.indexLabel}>{i}</span>;

                  if (m.postponed) {
                    return (
                      <div key={m.memberSeq} className={s.postponedRow}>
                        <span className={s.postponedMark}>△</span>
                        <div className={s.memberInfo}>
                          {label}
                          <strong className={s.postponedName}>{m.name}</strong>
                          <span className={s.phone}>{m.phoneNumber}</span>
                          <span className={s.postponedBadge}>연기중</span>
                        </div>
                      </div>
                    );
                  }
                  if (m.noMembership) {
                    return (
                      <div key={m.memberSeq} className={s.postponedRow}>
                        <span className={s.postponedMark}>!</span>
                        <div className={s.memberInfo}>
                          {label}
                          <strong className={s.postponedName}>{m.name}</strong>
                          <span className={s.phone}>{m.phoneNumber}</span>
                          <span className={s.postponedBadge}>멤버십 없음</span>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={m.memberSeq} className={m.staff ? s.memberRowStaff : s.memberRow}>
                      <input type="checkbox" checked={bulkChecked[m.memberSeq] ?? false}
                        onChange={e => setBulkChecked(prev => ({ ...prev, [m.memberSeq]: e.target.checked }))}
                        className={s.checkbox} />
                      <label className={s.checkLabel}>
                        {label}
                        <strong className={s.normalName}>{m.name}</strong>
                        <span className={s.phone}>{m.phoneNumber}</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setBulkModal(null)} className={s.cancelBtn}>취소</button>
              <button onClick={save} className={s.saveBtn}>저장</button>
            </div>
        </ModalOverlay>
      )}

      {resultModal && (
        <ModalOverlay size="md" onClose={() => setResultModal(null)}>
            <div className={`modal-header ${s.headerGreen}`}>
              <h3>{resultModal.className} — 출석 처리 결과</h3>
            </div>
            <div className="modal-body">
              <div className={s.resultInner}>
                <BulkResultSummary results={resultModal.results} />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setResultModal(null)} className={s.saveBtn}>확인</button>
            </div>
        </ModalOverlay>
      )}
    </>
  );

  return { open, rendered };
}

function BulkResultSummary({ results }: { results: BulkAttendanceResult[] }) {
  const groups: { filter: string; label: string; icon: string; dot: string }[] = [
    { filter: '출석',               label: '출석',           icon: '✅', dot: '#2e7d32' },
    { filter: '변경: 출석',          label: '결석→출석 변경', icon: '🔄', dot: '#1565c0' },
    { filter: '결석',               label: '결석',           icon: '⬜', dot: '#868e96' },
    { filter: '변경: 결석',          label: '출석→결석 변경', icon: '🔄', dot: '#e65100' },
    { filter: '연기',               label: '연기',           icon: '⏸️', dot: '#e67700' },
    { filter: 'skip_already',       label: '이미 처리됨',     icon: '⏭️', dot: '#adb5bd' },
    { filter: 'skip_no_membership', label: '멤버십 없음',     icon: '⚠️', dot: '#c92a2a' },
  ];

  const successCount = results.filter(r => r.status === '출석' || r.status === '변경: 출석').length;
  const changeCount  = results.filter(r => r.status === '변경: 출석' || r.status === '변경: 결석').length;
  const skipCount    = results.filter(r => r.status === 'skip_already' || r.status === 'skip_no_membership').length;

  return (
    <>
      <div className={s.resultStats}>
        <div className={`${s.resultStatCard} ${s.success}`}>
          <div className={s.resultStatNumber}>{successCount}</div>
          <div className={s.resultStatLabel}>출석 처리</div>
        </div>
        <div className={`${s.resultStatCard} ${s.warn}`}>
          <div className={s.resultStatNumber}>{changeCount}</div>
          <div className={s.resultStatLabel}>상태 변경</div>
        </div>
        <div className={`${s.resultStatCard} ${s.muted}`}>
          <div className={s.resultStatNumber}>{skipCount}</div>
          <div className={s.resultStatLabel}>스킵</div>
        </div>
      </div>

      {results.length === 0 && <div className={s.resultEmpty}>처리된 항목이 없습니다.</div>}

      {groups.map(g => {
        const items = results.filter(x => x.status === g.filter);
        if (items.length === 0) return null;
        return (
          <div key={g.filter} className={s.resultSection}>
            <div className={s.resultSectionHeader}>
              <span className={s.resultDot} style={{ background: g.dot }} />
              <span>{g.icon}</span>
              <span className={s.resultSectionTitle}>{g.label}</span>
              <span className={s.resultSectionCount}>{items.length}명</span>
            </div>
            <div className={s.resultChips}>
              {items.map((x, i) => (
                <span key={i} className={s.resultChip}>{x.name}</span>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}