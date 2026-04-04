'use client';

import { useState } from 'react';
import { memberApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import MemberForm, { emptyMemberForm, validateMemberForm, type MemberFormData } from '../MemberForm';
import { useResultModal } from '@/hooks/useResultModal';

export default function MemberAddPage() {
  const [form, setForm] = useState<MemberFormData>(emptyMemberForm);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.COMPLEX_MEMBERS });

  const handleSubmit = async () => {
    const error = validateMemberForm(form);
    if (error) { alert(error); return; }
    await run(memberApi.create({
      name: form.name,
      phoneNumber: form.phoneNumber,
      level: form.level || undefined,
      language: form.language || undefined,
      chartNumber: form.chartNumber || undefined,
      comment: form.comment || undefined,
    }), '회원이 등록되었습니다.');
  };

  return (
    <>
      <MemberForm form={form} onChange={setForm} onSubmit={handleSubmit}
        backHref={ROUTES.COMPLEX_MEMBERS} submitLabel="등록" />
      {modal}
    </>
  );
}
