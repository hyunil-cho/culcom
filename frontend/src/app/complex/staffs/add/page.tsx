'use client';

import { useState } from 'react';
import { staffApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import StaffForm, { emptyStaffForm, validateStaffForm, type StaffFormData } from '../StaffForm';
import { useResultModal } from '@/hooks/useResultModal';

export default function StaffAddPage() {
  const [form, setForm] = useState<StaffFormData>(emptyStaffForm);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.COMPLEX_STAFFS });

  const handleSubmit = async () => {
    const error = validateStaffForm(form);
    if (error) { alert(error); return; }
    await run(staffApi.create({
      name: form.name,
      phoneNumber: form.phoneNumber || undefined,
      email: form.email || undefined,
      subject: form.subject || undefined,
      status: form.status,
    }), '스태프가 등록되었습니다.');
  };

  return (
    <>
      <StaffForm form={form} onChange={setForm} onSubmit={handleSubmit}
        backHref={ROUTES.COMPLEX_STAFFS} submitLabel="등록" />
      {modal}
    </>
  );
}
