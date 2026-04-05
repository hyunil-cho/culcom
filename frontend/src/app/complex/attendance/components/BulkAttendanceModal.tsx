'use client';

import { useState } from 'react';
import { attendanceViewApi, AttendanceViewClass, AttendanceViewMember, BulkAttendanceResult } from '@/lib/api';

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
              <button onClick={save} style={{ padding: '8px 20px', border: 'none', borderRadius: 6, background: '#2e7d32', color: 'white', cursor: 'pointer', fontWeight: 600 }}>저장</button>
            </div>
          </div>
        </div>
      )}

      {resultModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setResultModal(null)}>
          <div className="modal-content" style={{ maxWidth: 400 }}>
            <div className="modal-header" style={{ background: '#2e7d32', borderColor: '#2e7d32' }}>
              <h3>{resultModal.className} — 출석 처리 결과</h3>
            </div>
            <div className="modal-body" style={{ padding: 10 }}>
              <div style={{ padding: 10, fontSize: '0.9rem', lineHeight: 1.8 }}>
                <BulkResultSummary results={resultModal.results} />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setResultModal(null)} style={{ padding: '8px 20px', border: 'none', borderRadius: 6, background: '#2e7d32', color: 'white', cursor: 'pointer', fontWeight: 600 }}>확인</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return { open, rendered };
}

function BulkResultSummary({ results }: { results: BulkAttendanceResult[] }) {
  const groups = [
    { filter: '출석', label: '출석', color: '#2e7d32' },
    { filter: '결석', label: '결석', color: '#888' },
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
          <div key={g.filter} style={{ marginBottom: 10, color: g.color }}>
            <strong>{g.label} ({items.length}명)</strong><br />
            {items.map(x => x.name).join(', ')}
          </div>
        );
      })}
    </>
  );
}
