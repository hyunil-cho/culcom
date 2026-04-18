'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { memberApi, type AttendanceViewMember } from '@/lib/api';
import { useClassSlots } from '../../hooks/useClassSlots';
import { ROUTES } from '@/lib/routes';
import ModalOverlay from '@/components/ui/ModalOverlay';
import { useSubmitLock } from '@/hooks/useSubmitLock';

interface Props {
  member: AttendanceViewMember;
  currentClassName: string;
  onClose: () => void;
  onMoved: () => void;
}

export default function MemberManageModal({ member, currentClassName, onClose, onMoved }: Props) {
  const router = useRouter();
  const [view, setView] = useState<'main' | 'move'>('main');
  const [search, setSearch] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<{ classSeq: number; name: string } | null>(null);
  const { submitting: moving, run } = useSubmitLock();

  const { timeSlots, allClasses } = useClassSlots();

  const classesWithSlot = useMemo(() =>
    allClasses.map(c => ({
      seq: c.seq,
      name: c.name,
      slotName: c.timeSlotName ?? '',
      isCurrent: c.name === currentClassName,
    })),
    [allClasses, currentClassName]
  );

  const filteredClasses = useMemo(() => {
    const term = search.toLowerCase();
    return classesWithSlot.filter(c =>
      c.name.toLowerCase().includes(term) || c.slotName.toLowerCase().includes(term)
    );
  }, [classesWithSlot, search]);

  const handleMove = (classSeq: number) => run(async () => {
    try {
      await memberApi.reassignClass(member.memberSeq, classSeq);
      onMoved();
    } catch {
      alert('수업 이동에 실패했습니다.');
    }
  });

  return (
    <ModalOverlay size="md" onClose={onClose}>
        <div className="modal-header">
          <h3>회원 관리 - {member.name}</h3>
        </div>
        <div className="modal-body">
          {confirmTarget ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: 15, fontSize: '0.95rem' }}>
                <strong>{member.name}</strong> 회원을 이동하시겠습니까?
              </p>
              <div style={{ margin: '15px 0', padding: 12, background: '#f8f9fa', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <span style={{ color: '#666' }}>{currentClassName}</span>
                <span style={{ color: '#4a90e2', fontWeight: 700 }}>→</span>
                <strong>{confirmTarget.name}</strong>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
                <button onClick={() => handleMove(confirmTarget.classSeq)} disabled={moving}
                  style={{ padding: '10px 24px', background: '#4a90e2', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
                  {moving ? '이동 중...' : '이동'}
                </button>
                <button onClick={() => setConfirmTarget(null)} disabled={moving}
                  style={{ padding: '10px 24px', background: '#e5e7eb', color: '#333', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
                  취소
                </button>
              </div>
            </div>
          ) : view === 'main' ? (
            <>
              <div style={{ background: '#f8f9fa', padding: 15, borderRadius: 8, marginBottom: 20 }}>
                <p style={{ margin: '5px 0' }}><strong>이름:</strong> {member.name}</p>
                <p style={{ margin: '5px 0' }}><strong>연락처:</strong> {member.phoneNumber}</p>
                <p style={{ margin: '5px 0' }}><strong>현재 수업:</strong> {currentClassName || '정보 없음'}</p>
                {member.membershipName && <p style={{ margin: '5px 0' }}><strong>멤버십:</strong> {member.membershipName}</p>}
                {member.level && <p style={{ margin: '5px 0' }}><strong>레벨:</strong> {member.level}</p>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => { onClose(); router.push(ROUTES.COMPLEX_MEMBER_EDIT(member.memberSeq)); }}
                  style={{ padding: 12, borderRadius: 6, fontWeight: 600, cursor: 'pointer', background: '#4a90e2', color: '#fff', border: 'none', fontSize: '0.9rem' }}>
                  상세 정보 및 수정
                </button>
                {!member.staff && (
                  <button onClick={() => setView('move')}
                    style={{ padding: 12, borderRadius: 6, fontWeight: 600, cursor: 'pointer', background: '#e3f2fd', color: '#1976d2', border: '1px solid #bbdefb', fontSize: '0.9rem' }}>
                    수업 이동
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 15 }}>
                <button onClick={() => setView('main')}
                  style={{ background: 'none', border: 'none', color: '#4a90e2', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                  ← 이전으로
                </button>
                <h4 style={{ margin: '10px 0', color: '#333' }}>이동할 수업 선택</h4>
                <p style={{ fontSize: '0.85rem', color: '#666' }}>현재 수업: <strong>{currentClassName}</strong></p>
                <div style={{ marginTop: 10, position: 'relative' }}>
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="수업명 또는 시간대 검색..." autoFocus
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.9rem', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {filteredClasses.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>검색 결과가 없습니다.</div>
                ) : filteredClasses.map(cls => (
                  <div key={cls.seq}
                    onClick={() => cls.isCurrent ? undefined : setConfirmTarget({ classSeq: cls.seq, name: cls.name })}
                    style={{
                      padding: '12px 14px', borderBottom: '1px solid #f0f0f0', cursor: cls.isCurrent ? 'default' : 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      opacity: cls.isCurrent ? 0.5 : 1, background: cls.isCurrent ? '#f1f3f5' : undefined,
                    }}
                    onMouseEnter={e => { if (!cls.isCurrent) e.currentTarget.style.background = '#f0f7ff'; }}
                    onMouseLeave={e => { if (!cls.isCurrent) e.currentTarget.style.background = ''; }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{cls.name} {cls.isCurrent && <small style={{ color: '#888' }}>(현재)</small>}</div>
                      <div style={{ fontSize: '0.8rem', color: '#888' }}>{cls.slotName}</div>
                    </div>
                    {!cls.isCurrent && <span style={{ color: '#4a90e2', fontSize: '0.8rem' }}>선택</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        {!confirmTarget && (
          <div className="modal-footer">
            <button onClick={onClose}
              style={{ padding: '8px 20px', border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
              닫기
            </button>
          </div>
        )}
    </ModalOverlay>
  );
}
