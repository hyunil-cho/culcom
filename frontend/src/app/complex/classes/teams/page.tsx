'use client';

import { Suspense, useEffect, useState } from 'react';
import {
  classApi, memberApi, staffApi,
  type ComplexClass, type ComplexMember, type ComplexStaff, type PageResponse,
} from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { queryClient } from '@/lib/queryClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { ROUTES } from '@/lib/routes';
import ResultModal from '@/components/ui/ResultModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useModal } from '@/hooks/useModal';
import ClassListPanel from './ClassListPanel';
import LeaderSection from './LeaderSection';
import MemberSection from './MemberSection';

type PendingAction =
  | { kind: 'leader-set'; staff: ComplexStaff }
  | { kind: 'leader-clear' }
  | { kind: 'member-add'; member: ComplexMember }
  | { kind: 'member-remove'; member: ComplexMember };

export default function ClassTeamsPage() {
  return (
    <Suspense fallback={null}>
      <ClassTeamsPageInner />
    </Suspense>
  );
}

function ClassTeamsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClassSeq = searchParams.get('classSeq');

  const { data: classPageData } = useApiQuery<PageResponse<ComplexClass>>(
    ['classes', 'teams'],
    () => classApi.list('page=0&size=200'),
    { refetchOnMount: 'always' },
  );
  const classes = classPageData?.content ?? [];

  const { data: staffs = [] } = useApiQuery<ComplexStaff[]>(
    ['staffs'],
    () => staffApi.list(),
    { refetchOnMount: 'always' },
  );

  const { data: memberPageData } = useApiQuery<PageResponse<ComplexMember>>(
    ['members', 'all'],
    () => memberApi.list('page=0&size=500'),
    { refetchOnMount: 'always' },
  );
  const allMembers = memberPageData?.content ?? [];

  const [selectedClass, setSelectedClass] = useState<ComplexClass | null>(null);

  // 초기 수업 선택
  useEffect(() => {
    if (initialClassSeq && classes.length > 0 && !selectedClass) {
      const target = classes.find((c) => c.seq === Number(initialClassSeq));
      if (target) setSelectedClass(target);
    }
  }, [classes, initialClassSeq, selectedClass]);

  const { data: teamMembers = [] } = useApiQuery<ComplexMember[]>(
    ['classMembers', selectedClass?.seq],
    () => classApi.listMembers(selectedClass!.seq),
    { enabled: !!selectedClass },
  );

  const resultModal = useModal<{ success: boolean; message: string }>();
  const pendingModal = useModal<PendingAction>();

  const refreshSelectedClass = (seq: number) => {
    classApi.get(seq).then((res) => {
      setSelectedClass(res.data);
      queryClient.invalidateQueries({ queryKey: ['classes', 'teams'] });
    });
  };

  const requestChangeLeader = (staffSeq: number | null) => {
    if (!selectedClass) return;
    if (selectedClass.staffSeq === (staffSeq ?? undefined)) return;
    if (staffSeq == null) {
      pendingModal.open({ kind: 'leader-clear' });
    } else {
      const staff = staffs.find((s) => s.seq === staffSeq);
      if (staff) pendingModal.open({ kind: 'leader-set', staff });
    }
  };

  const executePending = async () => {
    const pending = pendingModal.data;
    if (!selectedClass || !pending) return;
    try {
      if (pending.kind === 'member-add') {
        const res = await classApi.addMember(selectedClass.seq, pending.member.seq);
        if (!res.success) {
          resultModal.open({ success: false, message: res.message ?? '팀에 멤버를 추가하지 못했습니다.' });
          return;
        }
        queryClient.invalidateQueries({ queryKey: ['classMembers', selectedClass.seq] });
      } else if (pending.kind === 'member-remove') {
        const res = await classApi.removeMember(selectedClass.seq, pending.member.seq);
        if (!res.success) {
          resultModal.open({ success: false, message: res.message ?? '팀에서 멤버를 제외하지 못했습니다.' });
          return;
        }
        queryClient.invalidateQueries({ queryKey: ['classMembers', selectedClass.seq] });
      } else if (pending.kind === 'leader-set') {
        const res = await classApi.setLeader(selectedClass.seq, pending.staff.seq);
        if (!res.success) {
          resultModal.open({ success: false, message: res.message ?? '리더를 변경하지 못했습니다.' });
          return;
        }
        refreshSelectedClass(selectedClass.seq);
      } else if (pending.kind === 'leader-clear') {
        const res = await classApi.setLeader(selectedClass.seq, null);
        if (!res.success) {
          resultModal.open({ success: false, message: res.message ?? '리더를 해제하지 못했습니다.' });
          return;
        }
        refreshSelectedClass(selectedClass.seq);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '처리 실패';
      resultModal.open({ success: false, message });
    } finally {
      pendingModal.close();
    }
  };

  const pendingDialog = (() => {
    const pending = pendingModal.data;
    if (!pending || !selectedClass) return null;
    if (pending.kind === 'leader-set') {
      return {
        title: '리더 변경', confirmLabel: '변경', confirmColor: '#4a90e2',
        body: (
          <p style={{ margin: 0 }}>
            <strong>{selectedClass.name}</strong> 팀의 리더를{' '}
            {selectedClass.staffName ? <><strong>{selectedClass.staffName}</strong> → </> : ''}
            <strong>{pending.staff.name}</strong> (으)로 {selectedClass.staffName ? '변경' : '지정'}하시겠습니까?
          </p>
        ),
      };
    }
    if (pending.kind === 'leader-clear') {
      return {
        title: '리더 해제', confirmLabel: '해제', confirmColor: '#888',
        body: (
          <p style={{ margin: 0 }}>
            <strong>{selectedClass.name}</strong> 팀의 리더(<strong>{selectedClass.staffName}</strong>)를 해제하시겠습니까?
          </p>
        ),
      };
    }
    if (pending.kind === 'member-add') {
      return {
        title: '멤버 추가', confirmLabel: '추가', confirmColor: '#4a90e2',
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
        title: '멤버 제외', confirmLabel: '제외', confirmColor: '#e74c3c',
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

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>팀 구성</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
        <ClassListPanel
          classes={classes}
          selectedSeq={selectedClass?.seq}
          onSelect={setSelectedClass}
        />

        <div className="card" style={{ padding: 16, minHeight: 400 }}>
          {!selectedClass ? (
            <div style={{ color: '#999', textAlign: 'center', padding: 60 }}>
              왼쪽에서 수업을 선택해 주세요.
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ margin: 0 }}>{selectedClass.name}</h3>
                <small style={{ color: '#888' }}>
                  정원 {selectedClass.capacity}명 · 현재 {teamMembers.length}명
                  {selectedClass.timeSlotName ? ` · ${selectedClass.timeSlotName}` : ''}
                </small>
              </div>

              <LeaderSection
                selectedClass={selectedClass}
                staffs={staffs}
                onChangeLeader={requestChangeLeader}
              />

              <MemberSection
                selectedClass={selectedClass}
                teamMembers={teamMembers}
                allMembers={allMembers}
                onAddMember={(m) => pendingModal.open({ kind: 'member-add', member: m })}
                onRemoveMember={(m) => pendingModal.open({ kind: 'member-remove', member: m })}
                onOpenDetail={(seq) => router.push(ROUTES.COMPLEX_MEMBER_EDIT(seq))}
              />
            </>
          )}
        </div>
      </div>

      {pendingDialog && (
        <ConfirmModal
          title={pendingDialog.title}
          confirmLabel={pendingDialog.confirmLabel}
          confirmColor={pendingDialog.confirmColor}
          onCancel={pendingModal.close}
          onConfirm={executePending}
        >
          {pendingDialog.body}
        </ConfirmModal>
      )}

      {resultModal.isOpen && (
        <ResultModal
          success={resultModal.data!.success}
          message={resultModal.data!.message}
          onConfirm={resultModal.close}
        />
      )}
    </>
  );
}
