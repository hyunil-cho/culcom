'use client';

import { useState } from 'react';
import { memberApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import MemberForm, { emptyMemberForm, validateMemberForm, type MemberFormData } from '../MemberForm';
import ResultModal from '@/components/ui/ResultModal';

export default function MemberAddPage() {
  const [form, setForm] = useState<MemberFormData>(emptyMemberForm);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async () => {
    const error = validateMemberForm(form);
    if (error) { alert(error); return; }
    const res = await memberApi.create({
      name: form.name,
      phoneNumber: form.phoneNumber,
      level: form.level || undefined,
      language: form.language || undefined,
      chartNumber: form.chartNumber || undefined,
      comment: form.comment || undefined,
    });
    if (res.success) setResult({ success: true, message: '회원이 등록되었습니다.' });
  };

  return (
    <>
      <MemberForm form={form} onChange={setForm} onSubmit={handleSubmit}
        backHref={ROUTES.COMPLEX_MEMBERS} submitLabel="등록" />
      {result && <ResultModal success={result.success} message={result.message} redirectPath={ROUTES.COMPLEX_MEMBERS} />}
    </>
  );
}
