'use client';

import { ROUTES } from '@/lib/routes';
import StaffForm from '../StaffForm';
import { useStaffForm } from '../useStaffForm';

export default function StaffAddPage() {
  const { form, setForm, classAssign, setClassAssign, handleSubmit, modal } = useStaffForm();

  return (
    <>
      <StaffForm form={form} onChange={setForm} onSubmit={handleSubmit}
        backHref={ROUTES.COMPLEX_STAFFS} submitLabel="등록"
        classAssign={classAssign} onClassAssignChange={setClassAssign} />
      {modal}
    </>
  );
}
