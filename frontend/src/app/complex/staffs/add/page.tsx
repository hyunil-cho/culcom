'use client';

import { useState } from 'react';
import { staffApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import StaffForm, { emptyStaffForm, validateStaffForm, type StaffFormData } from '../StaffForm';
import ResultModal from '@/components/ui/ResultModal';

export default function StaffAddPage() {
  const [form, setForm] = useState<StaffFormData>(emptyStaffForm);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async () => {
    const error = validateStaffForm(form);
    if (error) { alert(error); return; }
    const res = await staffApi.create({
      name: form.name,
      phoneNumber: form.phoneNumber || undefined,
      email: form.email || undefined,
      subject: form.subject || undefined,
      status: form.status,
    });
    if (res.success) setResult({ success: true, message: '스태프가 등록되었습니다.' });
  };

  return (
    <>
      <StaffForm form={form} onChange={setForm} onSubmit={handleSubmit}
        backHref={ROUTES.COMPLEX_STAFFS} submitLabel="등록" />
      {result && <ResultModal success={result.success} message={result.message} redirectPath={ROUTES.COMPLEX_STAFFS} />}
    </>
  );
}
