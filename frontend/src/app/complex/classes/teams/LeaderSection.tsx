'use client';

import { useMemo, useState } from 'react';
import type { ComplexClass, ComplexStaff } from '@/lib/api';

interface LeaderSectionProps {
  selectedClass: ComplexClass;
  staffs: ComplexStaff[];
  onChangeLeader: (staffSeq: number | null) => void;
}

export default function LeaderSection({ selectedClass, staffs, onChangeLeader }: LeaderSectionProps) {
  const [keyword, setKeyword] = useState('');

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return staffs;
    return staffs.filter(
      (s) => s.name.toLowerCase().includes(kw) || (s.phoneNumber ?? '').includes(kw),
    );
  }, [staffs, keyword]);

  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        borderBottom: '2px solid #4a90e2', paddingBottom: 6, marginBottom: 12,
      }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 15, color: '#333' }}>리더</h4>
          <small style={{ color: '#888' }}>이 팀을 담당할 스태프를 선택하세요.</small>
        </div>
      </div>

      {/* 현재 리더 표시 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 14px', background: '#f8fafc', border: '1px solid #e6ecf2', borderRadius: 6, marginBottom: 10,
      }}>
        <div>
          <span style={{ fontSize: 12, color: '#888', marginRight: 8 }}>현재 리더</span>
          {selectedClass.staffName ? (
            <strong style={{ fontSize: 15 }}>{selectedClass.staffName}</strong>
          ) : (
            <span style={{ color: '#bbb' }}>(미배정)</span>
          )}
        </div>
        {selectedClass.staffSeq && (
          <button
            onClick={() => onChangeLeader(null)}
            style={{
              background: 'transparent', border: '1px solid #bbb', color: '#666',
              borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12,
            }}
          >
            리더 해제
          </button>
        )}
      </div>

      {/* 스태프 검색 + 선택 리스트 */}
      <input
        type="text"
        placeholder="스태프 이름/연락처 검색"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, marginBottom: 8 }}
      />
      <div style={{ border: '1px solid #eee', borderRadius: 6, maxHeight: 200, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 16, color: '#999', textAlign: 'center', fontSize: 13 }}>
            등록된 스태프가 없습니다.
          </div>
        ) : (
          filtered.map((s, idx) => {
            const active = selectedClass.staffSeq === s.seq;
            return (
              <button
                key={s.seq}
                onClick={() => onChangeLeader(s.seq)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', padding: '10px 14px',
                  borderTop: idx === 0 ? 'none' : '1px solid #f1f1f1',
                  border: 'none',
                  borderLeft: active ? '3px solid #4a90e2' : '3px solid transparent',
                  background: active ? '#eaf3fd' : '#fff',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                }}
              >
                <span>
                  <strong>{s.name}</strong>
                  {s.phoneNumber && (
                    <span style={{ color: '#888', marginLeft: 8, fontSize: 13 }}>{s.phoneNumber}</span>
                  )}
                </span>
                {active && <span style={{ color: '#4a90e2', fontSize: 12, fontWeight: 600 }}>✓ 리더</span>}
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
