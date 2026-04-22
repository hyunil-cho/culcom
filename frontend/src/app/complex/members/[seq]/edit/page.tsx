'use client';

import { useParams } from 'next/navigation';
import { ROUTES } from '@/lib/routes';
import MemberForm from '../../MemberForm';
import { useMemberForm } from '../../useMemberForm';

export default function MemberEditPage() {
  const seq = Number(useParams().seq);
  const {
    form, setForm, membership, classAssign, setClassAssign,
    staffForm, setStaffForm, staffClassAssign, setStaffClassAssign,
    handleSubmit, modal,
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
    </>
  );
}
