'use client';

import { useState } from 'react';
import { classApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import ClassForm, { emptyClassForm, validateClassForm, type ClassFormData } from '../ClassForm';
import { useResultModal } from '@/hooks/useResultModal';
import { useClassSlots } from '../../hooks/useClassSlots';

export default function ClassAddPage() {
  const [form, setForm] = useState<ClassFormData>(emptyClassForm);
  const { timeSlots } = useClassSlots();
  const { run, modal } = useResultModal({ redirectPath: ROUTES.COMPLEX_CLASSES });

  const handleSubmit = async () => {
    const error = validateClassForm(form);
    if (error) { alert(error); return; }
    await run(classApi.create({
      name: form.name,
      description: form.description || undefined,
      capacity: form.capacity,
      timeSlotSeq: form.timeSlotSeq as number,
    }), '수업이 등록되었습니다.');
  };

  return (
    <>
      <ClassForm
        form={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        backHref={ROUTES.COMPLEX_CLASSES}
        submitLabel="등록"
        timeSlots={timeSlots}
      />
      {modal}
    </>
  );
}
