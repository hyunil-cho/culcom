'use client';

import { useParams } from 'next/navigation';
import { ROUTES } from '@/lib/routes';
import MemberForm from '../../MemberForm';
import { useMemberForm } from '../../useMemberForm';
import TransferMismatchModal from '../../components/TransferMismatchModal';

export default function MemberEditPage() {
  const seq = Number(useParams().seq);
  const {
    form, setForm, membership, classAssign, setClassAssign,
    staffForm, setStaffForm, staffClassAssign, setStaffClassAssign,
    handleSubmit, modal,
    showTransferMismatch, confirmMismatchAndSubmit, dismissMismatch,
    formError,
  } = useMemberForm(seq);

  return (
    <>
      <MemberForm form={form} onChange={setForm} onSubmit={handleSubmit}
        isEdit backHref={ROUTES.COMPLEX_MEMBERS} submitLabel="수정"
        membershipSection={membership.formSection} membershipEnabled={membership.enabled}
        classAssign={classAssign} onClassAssignChange={setClassAssign}
        staffForm={staffForm} onStaffChange={setStaffForm}
        staffClassAssign={staffClassAssign} onStaffClassAssignChange={setStaffClassAssign}
        currentMemberSeq={seq} formError={formError}
        headerExtra={membership.changeButton} />
      {modal}
      {membership.changeModal}

      {/* 양도 이름/전화번호 불일치 경고 모달 (수정 모드에서도 양도 선택 시 발생 가능) */}
      {showTransferMismatch && membership.selectedTransfer && (
        <TransferMismatchModal
          memberName={form.name}
          memberPhone={form.phoneNumber}
          transfer={membership.selectedTransfer}
          onConfirm={confirmMismatchAndSubmit}
          onCancel={dismissMismatch}
        />
      )}
    </>
  );
}
