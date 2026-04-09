'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { consentItemApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useResultModal } from '@/hooks/useResultModal';
import ConsentItemForm, { emptyForm, validateForm, type ConsentItemFormData } from '../../ConsentItemForm';

export default function ConsentItemEditPage() {
  const seq = Number(useParams().seq);
  const [form, setForm] = useState<ConsentItemFormData>(emptyForm);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.CONSENT_ITEMS });

  useEffect(() => {
    consentItemApi.get(seq).then(res => {
      const d = res.data;
      setForm({ title: d.title, content: d.content, required: d.required, category: d.category });
    });
  }, [seq]);

  const handleSubmit = async () => {
    const error = validateForm(form);
    if (error) { alert(error); return; }
    await run(consentItemApi.update(seq, form), '동의항목이 수정되었습니다.');
  };

  return (
    <>
      <ConsentItemForm form={form} onChange={setForm} onSubmit={handleSubmit} isEdit submitLabel="수정" />
      {modal}
    </>
  );
}
