'use client';

import { useMemo, useState } from 'react';
import type { ComplexClass } from '@/lib/api';

interface ClassListPanelProps {
  classes: ComplexClass[];
  selectedSeq?: number;
  onSelect: (cls: ComplexClass) => void;
}

export default function ClassListPanel({ classes, selectedSeq, onSelect }: ClassListPanelProps) {
  const [keyword, setKeyword] = useState('');

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return classes;
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(kw) ||
        (c.staffName ?? '').toLowerCase().includes(kw) ||
        (c.timeSlotName ?? '').toLowerCase().includes(kw),
    );
  }, [classes, keyword]);

  return (
    <div className="card" style={{ padding: 12 }}>
      <input
        type="text"
        placeholder="수업/리더/시간대 검색"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        style={{ width: '100%', padding: '8px 10px', marginBottom: 10, border: '1px solid #ddd', borderRadius: 6 }}
      />
      <div style={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>등록된 수업이 없습니다.</div>
        )}
        {filtered.map((c) => {
          const active = selectedSeq === c.seq;
          return (
            <button
              key={c.seq}
              onClick={() => onSelect(c)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                marginBottom: 6,
                borderRadius: 6,
                border: active ? '1px solid #4a90e2' : '1px solid #eee',
                background: active ? '#eaf3fd' : '#fff',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                <span style={{ fontSize: 12, color: '#888' }}>
                  정원 {c.capacity}명 · 현재 {c.memberCount ?? 0}명
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>
                {c.staffName ? `리더: ${c.staffName}` : <span style={{ color: '#bbb' }}>(리더 미배정)</span>}
                {c.timeSlotName ? ` · ${c.timeSlotName}` : ''}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
