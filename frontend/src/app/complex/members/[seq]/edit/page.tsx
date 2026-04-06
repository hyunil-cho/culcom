'use client';

import { useParams } from 'next/navigation';
import { ROUTES } from '@/lib/routes';
import MemberForm from '../../MemberForm';
import { useMemberForm } from '../../useMemberForm';

export default function MemberEditPage() {
  const seq = Number(useParams().seq);
  const {
    form, setForm, msForm, setMsForm, classAssign, setClassAssign,
    staffForm, setStaffForm, staffClassAssign, setStaffClassAssign,
    handleSubmit, modal,
  } = useMemberForm(seq);

  return (
    <>
      <MemberForm form={form} onChange={setForm} onSubmit={handleSubmit}
        isEdit backHref={ROUTES.COMPLEX_MEMBERS} submitLabel="수정"
        membershipForm={msForm} onMembershipChange={setMsForm}
        classAssign={classAssign} onClassAssignChange={setClassAssign}
        staffForm={staffForm} onStaffChange={setStaffForm}
        staffClassAssign={staffClassAssign} onStaffClassAssignChange={setStaffClassAssign}
        currentMemberSeq={seq} />
      {modal}
    </>
  );
}
