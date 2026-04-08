'use client';

import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  classApi,
  memberApi,
  staffApi,
  type ComplexClass,
  type ComplexMember,
  type ComplexStaff,
} from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { ROUTES } from '@/lib/routes';
import ResultModal from '@/components/ui/ResultModal';
import ConfirmModal from '@/components/ui/ConfirmModal';

type PendingAction =
  | { kind: 'leader-set'; staff: ComplexStaff }
  | { kind: 'leader-clear' }
  | { kind: 'member-add'; member: ComplexMember }
  | { kind: 'member-remove'; member: ComplexMember };

function SectionHeader({ title, desc, right }: { title: string; desc?: string; right?: ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      borderBottom: '2px solid #4a90e2',
      paddingBottom: 6,
      marginBottom: 12,
    }}>
      <div>
        <h4 style={{ margin: 0, fontSize: 15, color: '#333' }}>{title}</h4>
        {desc && <small style={{ color: '#888' }}>{desc}</small>}
      </div>
      {right}
    </div>
  );
}

export default function ClassTeamsPage() {
  return (
    <Suspense fallback={null}>
      <ClassTeamsPageInner />
    </Suspense>
  );
}

function ClassTeamsPageInner() {
  const [classes, setClasses] = useState<ComplexClass[]>([]);
  const [staffs, setStaffs] = useState<ComplexStaff[]>([]);
  const [allMembers, setAllMembers] = useState<ComplexMember[]>([]);
  const [classKeyword, setClassKeyword] = useState('');

  const [selectedClass, setSelectedClass] = useState<ComplexClass | null>(null);
  const [teamMembers, setTeamMembers] = useState<ComplexMember[]>([]);
  const [memberKeyword, setMemberKeyword] = useState('');
  const [leaderKeyword, setLeaderKeyword] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClassSeq = searchParams.get('classSeq');

  const openDetail = (memberSeq: number) => {
    router.push(ROUTES.COMPLEX_MEMBER_EDIT(memberSeq));
  };

  // 초기 로드: 수업/스태프/회원
  useEffect(() => {
    classApi.list('page=0&size=200').then((res) => {
      setClasses(res.data.content);
      if (initialClassSeq) {
        const target = res.data.content.find((c) => c.seq === Number(initialClassSeq));
        if (target) setSelectedClass(target);
      }
    });
    staffApi.list().then((res) => setStaffs(res.data));
    memberApi.list('page=0&size=500').then((res) => setAllMembers(res.data.content));
  }, []);

  // 수업 선택 시 팀 멤버 로드
  useEffect(() => {
    if (!selectedClass) {
      setTeamMembers([]);
      return;
    }
    classApi.listMembers(selectedClass.seq).then((res) => setTeamMembers(res.data));
  }, [selectedClass?.seq]);

  const filteredClasses = useMemo(() => {
    const kw = classKeyword.trim().toLowerCase();
    if (!kw) return classes;
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(kw) ||
        (c.staffName ?? '').toLowerCase().includes(kw) ||
        (c.timeSlotName ?? '').toLowerCase().includes(kw),
    );
  }, [classes, classKeyword]);

  const teamMemberSeqs = useMemo(() => new Set(teamMembers.map((m) => m.seq)), [teamMembers]);

  const candidateMembers = useMemo(() => {
    const kw = memberKeyword.trim().toLowerCase();
    const leaderSeq = selectedClass?.staffSeq;
    return allMembers
      .filter((m) => !teamMemberSeqs.has(m.seq))
      // 자기 자신이 리더인 팀에는 멤버로 들어갈 수 없다.
      .filter((m) => leaderSeq == null || m.seq !== leaderSeq)
      .filter(
        (m) =>
          !kw ||
          m.name.toLowerCase().includes(kw) ||
          (m.phoneNumber ?? '').includes(kw),
      );
  }, [allMembers, teamMemberSeqs, memberKeyword, selectedClass?.staffSeq]);

  const refreshSelectedClass = (seq: number) => {
    classApi.get(seq).then((res) => {
      setSelectedClass(res.data);
      setClasses((prev) => prev.map((c) => (c.seq === seq ? res.data : c)));
    });
  };

  const requestAddMember = (member: ComplexMember) => {
    if (!selectedClass) return;
    setPending({ kind: 'member-add', member });
  };

  const requestRemoveMember = (member: ComplexMember) => {
    setPending({ kind: 'member-remove', member });
  };

  const requestChangeLeader = (staffSeq: number | null) => {
    if (!selectedClass) return;
    if (selectedClass.staffSeq === (staffSeq ?? undefined)) return;
    if (staffSeq == null) {
      setPending({ kind: 'leader-clear' });
    } else {
      const staff = staffs.find((s) => s.seq === staffSeq);
      if (staff) setPending({ kind: 'leader-set', staff });
    }
  };

  const executePending = async () => {
    if (!selectedClass || !pending) return;
    try {
      if (pending.kind === 'member-add') {
        await classApi.addMember(selectedClass.seq, pending.member.seq);
        const res = await classApi.listMembers(selectedClass.seq);
        setTeamMembers(res.data);
        setMemberKeyword('');
      } else if (pending.kind === 'member-remove') {
        await classApi.removeMember(selectedClass.seq, pending.member.seq);
        setTeamMembers((prev) => prev.filter((m) => m.seq !== pending.member.seq));
      } else if (pending.kind === 'leader-set') {
        await classApi.setLeader(selectedClass.seq, pending.staff.seq);
        refreshSelectedClass(selectedClass.seq);
      } else if (pending.kind === 'leader-clear') {
        await classApi.setLeader(selectedClass.seq, null);
        refreshSelectedClass(selectedClass.seq);
      }
    } catch (e: any) {
      setResult({ success: false, message: e?.message ?? '처리 실패' });
    } finally {
      setPending(null);
    }
  };

  const pendingDialog = (() => {
    if (!pending || !selectedClass) return null;
    if (pending.kind === 'leader-set') {
      return {
        title: '리더 변경',
        confirmLabel: '변경',
        confirmColor: '#4a90e2',
        body: (
          <>
            <p style={{ margin: 0 }}>
              <strong>{selectedClass.name}</strong> 팀의 리더를{' '}
              {selectedClass.staffName ? <><strong>{selectedClass.staffName}</strong> → </> : ''}
              <strong>{pending.staff.name}</strong> (으)로 {selectedClass.staffName ? '변경' : '지정'}하시겠습니까?
            </p>
          </>
        ),
      };
    }
    if (pending.kind === 'leader-clear') {
      return {
        title: '리더 해제',
        confirmLabel: '해제',
        confirmColor: '#888',
        body: (
          <p style={{ margin: 0 }}>
            <strong>{selectedClass.name}</strong> 팀의 리더(<strong>{selectedClass.staffName}</strong>)를 해제하시겠습니까?
          </p>
        ),
      };
    }
    if (pending.kind === 'member-add') {
      return {
        title: '멤버 추가',
        confirmLabel: '추가',
        confirmColor: '#4a90e2',
        body: (
          <p style={{ margin: 0 }}>
            <strong>{pending.member.name}</strong> ({pending.member.phoneNumber}) 회원을{' '}
            <strong>{selectedClass.name}</strong> 팀에 추가하시겠습니까?
          </p>
        ),
      };
    }
    if (pending.kind === 'member-remove') {
      return {
        title: '멤버 제외',
        confirmLabel: '제외',
        confirmColor: '#e74c3c',
        body: (
          <p style={{ margin: 0 }}>
            <strong>{pending.member.name}</strong> ({pending.member.phoneNumber}) 회원을{' '}
            <strong>{selectedClass.name}</strong> 팀에서 제외하시겠습니까?
          </p>
        ),
      };
    }
    return null;
  })();

  const filteredStaffs = useMemo(() => {
    const kw = leaderKeyword.trim().toLowerCase();
    if (!kw) return staffs;
    return staffs.filter(
      (s) => s.name.toLowerCase().includes(kw) || (s.phoneNumber ?? '').includes(kw),
    );
  }, [staffs, leaderKeyword]);

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>팀 구성</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
        {/* 좌: 수업(팀) 리스트 */}
        <div className="card" style={{ padding: 12 }}>
          <input
            type="text"
            placeholder="수업/리더/시간대 검색"
            value={classKeyword}
            onChange={(e) => setClassKeyword(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', marginBottom: 10, border: '1px solid #ddd', borderRadius: 6 }}
          />
          <div style={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
            {filteredClasses.length === 0 && (
              <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>등록된 수업이 없습니다.</div>
            )}
            {filteredClasses.map((c) => {
              const active = selectedClass?.seq === c.seq;
              return (
                <button
                  key={c.seq}
                  onClick={() => setSelectedClass(c)}
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

        {/* 우: 선택한 팀 상세 */}
        <div className="card" style={{ padding: 16, minHeight: 400 }}>
          {!selectedClass ? (
            <div style={{ color: '#999', textAlign: 'center', padding: 60 }}>
              왼쪽에서 수업을 선택해 주세요.
            </div>
          ) : (
            <>
              {/* 헤더: 수업 정보만 */}
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ margin: 0 }}>{selectedClass.name}</h3>
                <small style={{ color: '#888' }}>
                  정원 {selectedClass.capacity}명 · 현재 {teamMembers.length}명
                  {selectedClass.timeSlotName ? ` · ${selectedClass.timeSlotName}` : ''}
                </small>
              </div>

              {/* ── 리더 섹션 ── */}
              <section style={{ marginBottom: 24 }}>
                <SectionHeader title="리더" desc="이 팀을 담당할 스태프를 선택하세요." />

                {/* 현재 리더 표시 */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: '#f8fafc',
                    border: '1px solid #e6ecf2',
                    borderRadius: 6,
                    marginBottom: 10,
                  }}
                >
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
                      onClick={() => requestChangeLeader(null)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #bbb',
                        color: '#666',
                        borderRadius: 4,
                        padding: '4px 10px',
                        cursor: 'pointer',
                        fontSize: 12,
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
                  value={leaderKeyword}
                  onChange={(e) => setLeaderKeyword(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, marginBottom: 8 }}
                />
                <div style={{ border: '1px solid #eee', borderRadius: 6, maxHeight: 200, overflowY: 'auto' }}>
                  {filteredStaffs.length === 0 ? (
                    <div style={{ padding: 16, color: '#999', textAlign: 'center', fontSize: 13 }}>
                      등록된 스태프가 없습니다.
                    </div>
                  ) : (
                    filteredStaffs.map((s, idx) => {
                      const active = selectedClass.staffSeq === s.seq;
                      return (
                        <button
                          key={s.seq}
                          onClick={() => requestChangeLeader(s.seq)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%',
                            padding: '10px 14px',
                            borderTop: idx === 0 ? 'none' : '1px solid #f1f1f1',
                            border: 'none',
                            borderLeft: active ? '3px solid #4a90e2' : '3px solid transparent',
                            background: active ? '#eaf3fd' : '#fff',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontFamily: 'inherit',
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

              {/* ── 멤버 섹션 ── */}
              <section>
                <SectionHeader
                  title="멤버"
                  desc="팀에 소속된 회원을 관리합니다."
                  right={<span style={{ fontSize: 12, color: '#888' }}>{teamMembers.length} / {selectedClass.capacity}명</span>}
                />

                {/* 멤버 추가 영역: 검색 입력 + 결과 리스트 */}
                <div style={{ marginBottom: 10 }}>
                  <input
                    type="text"
                    placeholder="이름 또는 연락처로 회원 검색"
                    value={memberKeyword}
                    onChange={(e) => setMemberKeyword(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6 }}
                  />
                  {memberKeyword.trim() && (
                    <div style={{
                      marginTop: 6,
                      border: '1px solid #e0e0e0',
                      borderRadius: 6,
                      maxHeight: 220,
                      overflowY: 'auto',
                      background: '#fff',
                    }}>
                      {candidateMembers.length === 0 ? (
                        <div style={{ padding: 14, color: '#999', textAlign: 'center', fontSize: 13 }}>
                          검색 결과가 없습니다.
                        </div>
                      ) : (
                        <>
                          <div style={{ padding: '6px 12px', fontSize: 11, color: '#888', background: '#fafafa', borderBottom: '1px solid #eee' }}>
                            검색결과 {candidateMembers.length}명 {candidateMembers.length > 50 && '(상위 50명 표시)'}
                          </div>
                          {candidateMembers.slice(0, 50).map((m, idx) => (
                            <button
                              key={m.seq}
                              onClick={() => requestAddMember(m)}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                width: '100%',
                                padding: '8px 12px',
                                borderTop: idx === 0 ? 'none' : '1px solid #f1f1f1',
                                border: 'none',
                                background: '#fff',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontFamily: 'inherit',
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
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
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
                            onClick={() => openDetail(m.seq)}
                            style={{
                              background: 'transparent',
                              border: '1px solid #4a90e2',
                              color: '#4a90e2',
                              borderRadius: 4,
                              padding: '4px 10px',
                              cursor: 'pointer',
                              fontSize: 12,
                            }}
                          >
                            상세
                          </button>
                          <button
                            onClick={() => requestRemoveMember(m)}
                            style={{
                              background: 'transparent',
                              border: '1px solid #e74c3c',
                              color: '#e74c3c',
                              borderRadius: 4,
                              padding: '4px 10px',
                              cursor: 'pointer',
                              fontSize: 12,
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
            </>
          )}
        </div>
      </div>

      {pendingDialog && (
        <ConfirmModal
          title={pendingDialog.title}
          confirmLabel={pendingDialog.confirmLabel}
          confirmColor={pendingDialog.confirmColor}
          onCancel={() => setPending(null)}
          onConfirm={executePending}
        >
          {pendingDialog.body}
        </ConfirmModal>
      )}

      {result && (
        <ResultModal
          success={result.success}
          message={result.message}
          onConfirm={() => setResult(null)}
        />
      )}
    </>
  );
}
