'use client';

import { useState } from 'react';
import { consentItemApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useResultModal } from '@/hooks/useResultModal';
import ConsentItemForm, { emptyForm, validateForm } from '../ConsentItemForm';

export default function ConsentItemAddPage() {
  const [form, setForm] = useState(emptyForm);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.CONSENT_ITEMS });

  const handleSubmit = async () => {
    const error = validateForm(form);
    if (error) { alert(error); return; }
    await run(consentItemApi.create(form), '동의항목이 등록되었습니다.');
  };

  return (
    <>
      <ConsentItemForm form={form} onChange={setForm} onSubmit={handleSubmit} submitLabel="등록" />
      {modal}
    </>
  );
}
