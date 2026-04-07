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
    const checked: Record<number, boolean> = {};
    cls.members.forEach(m => {
      if (!m.postponed) checked[m.memberSeq] = m.status === 'O';
    });
    setBulkChecked(checked);
    setBulkModal({ classSeq: cls.classSeq, className: cls.name, members: cls.members });
  };

  const save = async () => {
    if (!bulkModal) return;
    const members = bulkModal.members.map(m => ({
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
                    bulkModal.members.forEach(m => { if (!m.postponed) next[m.memberSeq] = true; });
                    setBulkChecked(next);
                  }} className={s.selectAllBtn}>전체 출석</button>
                  <button type="button" onClick={() => {
                    const next: Record<number, boolean> = {};
                    bulkModal.members.forEach(m => { if (!m.postponed) next[m.memberSeq] = false; });
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
        <ModalOverlay size="sm" onClose={() => setResultModal(null)}>
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
  const groups = [
    { filter: '출석', label: '출석', color: '#2e7d32' },
    { filter: '결석', label: '결석', color: '#888' },
    { filter: '변경: 출석', label: '결석→출석 변경', color: '#1565c0' },
    { filter: '변경: 결석', label: '출석→결석 변경', color: '#e65100' },
    { filter: '연기', label: '연기', color: '#e67700' },
    { filter: 'skip_already', label: '이미 처리됨', color: '#999' },
    { filter: 'skip_no_membership', label: '멤버십 없음', color: '#c92a2a' },
  ];
  return (
    <>
      {groups.map(g => {
        const items = results.filter(x => x.status === g.filter);
        if (items.length === 0) return null;
        return (
          <div key={g.filter} className="resultGroup" style={{ marginBottom: 10, color: g.color }}>
            <strong>{g.label} ({items.length}명)</strong><br />
            {items.map(x => x.name).join(', ')}
          </div>
        );
      })}
    </>
  );
}