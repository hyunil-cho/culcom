'use client';

import { useState } from 'react';
import { consentItemApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useResultModal } from '@/hooks/useResultModal';
import { useFormError } from '@/hooks/useFormError';
import ConsentItemForm, { emptyForm, validateForm } from '../ConsentItemForm';

export default function ConsentItemAddPage() {
  const [form, setForm] = useState(emptyForm);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.CONSENT_ITEMS, invalidateKeys: ['consentItems'] });
  const { error: formError, validate, clear: clearError } = useFormError();

  const handleSubmit = async () => {
    if (!validate(validateForm(form))) return;
    clearError();
    await run(consentItemApi.create(form), '동의항목이 등록되었습니다.');
  };

  return (
    <>
      <ConsentItemForm form={form} onChange={setForm} onSubmit={handleSubmit} submitLabel="등록" formError={formError} />
      {modal}
    </>
  );
}
