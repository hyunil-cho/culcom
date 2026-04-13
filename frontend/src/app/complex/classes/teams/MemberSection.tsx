'use client';

import { useMemo, useState } from 'react';
import type { ComplexClass, ComplexMember } from '@/lib/api';

interface MemberSectionProps {
  selectedClass: ComplexClass;
  teamMembers: ComplexMember[];
  allMembers: ComplexMember[];
  onAddMember: (member: ComplexMember) => void;
  onRemoveMember: (member: ComplexMember) => void;
  onOpenDetail: (memberSeq: number) => void;
}

export default function MemberSection({
  selectedClass, teamMembers, allMembers,
  onAddMember, onRemoveMember, onOpenDetail,
}: MemberSectionProps) {
  const [keyword, setKeyword] = useState('');

  const teamMemberSeqs = useMemo(() => new Set(teamMembers.map((m) => m.seq)), [teamMembers]);

  const candidates = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const leaderSeq = selectedClass.staffSeq;
    return allMembers
      .filter((m) => !teamMemberSeqs.has(m.seq))
      .filter((m) => leaderSeq == null || m.seq !== leaderSeq)
      .filter(
        (m) =>
          !kw ||
          m.name.toLowerCase().includes(kw) ||
          (m.phoneNumber ?? '').includes(kw),
      );
  }, [allMembers, teamMemberSeqs, keyword, selectedClass.staffSeq]);

  return (
    <section>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        borderBottom: '2px solid #4a90e2', paddingBottom: 6, marginBottom: 12,
      }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 15, color: '#333' }}>멤버</h4>
          <small style={{ color: '#888' }}>팀에 소속된 회원을 관리합니다.</small>
        </div>
        <span style={{ fontSize: 12, color: '#888' }}>{teamMembers.length} / {selectedClass.capacity}명</span>
      </div>

      {/* 멤버 추가: 검색 + 결과 */}
      <div style={{ marginBottom: 10 }}>
        <input
          type="text"
          placeholder="이름 또는 연락처로 회원 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6 }}
        />
        {keyword.trim() && (
          <div style={{
            marginTop: 6, border: '1px solid #e0e0e0', borderRadius: 6,
            maxHeight: 220, overflowY: 'auto', background: '#fff',
          }}>
            {candidates.length === 0 ? (
              <div style={{ padding: 14, color: '#999', textAlign: 'center', fontSize: 13 }}>
                검색 결과가 없습니다.
              </div>
            ) : (
              <>
                <div style={{ padding: '6px 12px', fontSize: 11, color: '#888', background: '#fafafa', borderBottom: '1px solid #eee' }}>
                  검색결과 {candidates.length}명 {candidates.length > 50 && '(상위 50명 표시)'}
                </div>
                {candidates.slice(0, 50).map((m, idx) => (
                  <button
                    key={m.seq}
                    onClick={() => { onAddMember(m); setKeyword(''); }}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      width: '100%', padding: '8px 12px',
                      borderTop: idx === 0 ? 'none' : '1px solid #f1f1f1',
                      border: 'none', background: '#fff', cursor: 'pointer',
                      textAlign: 'left', fontFamily: 'inherit',
                    }}
                  >
                    <span>
                      <strong>{m.name}</strong>
                      <span style={{ color: '#888', marginLeft: 8, fontSize: 13 }}>{m.phoneNumber}</span>
                      {m.level && <span className="badge badge-success" style={{ marginLeft: 8 }}>{m.level}</span>}
                    </span>
                    <span style={{ color: '#4a90e2', fontSize: 12, fontWeight: 600 }}>+ 추가</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* 팀 멤버 리스트 */}
      <div style={{ border: '1px solid #eee', borderRadius: 6 }}>
        {teamMembers.length === 0 ? (
          <div style={{ padding: 24, color: '#999', textAlign: 'center' }}>아직 소속된 멤버가 없습니다.</div>
        ) : (
          teamMembers.map((m, idx) => (
            <div
              key={m.seq}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px',
                borderTop: idx === 0 ? 'none' : '1px solid #f1f1f1',
              }}
            >
              <div>
                <strong>{m.name}</strong>
                <span style={{ color: '#888', marginLeft: 8, fontSize: 13 }}>{m.phoneNumber}</span>
                {m.level && <span className="badge badge-success" style={{ marginLeft: 8 }}>{m.level}</span>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => onOpenDetail(m.seq)}
                  style={{
                    background: 'transparent', border: '1px solid #4a90e2', color: '#4a90e2',
                    borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12,
                  }}
                >
                  상세
                </button>
                <button
                  onClick={() => onRemoveMember(m)}
                  style={{
                    background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c',
                    borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12,
                  }}
                >
                  제외
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
