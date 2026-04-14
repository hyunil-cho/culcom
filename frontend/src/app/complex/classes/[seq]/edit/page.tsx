'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { classApi } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useClassSlots } from '../../../hooks/useClassSlots';
import { ROUTES } from '@/lib/routes';
import ClassForm, { emptyClassForm, validateClassForm, type ClassFormData } from '../../ClassForm';
import { useResultModal } from '@/hooks/useResultModal';
import { useFormError } from '@/hooks/useFormError';

export default function ClassEditPage() {
  const params = useParams();
  const seq = Number(params.seq);
  const [form, setForm] = useState<ClassFormData>(emptyClassForm);
  const { timeSlots } = useClassSlots();
  const { run, modal } = useResultModal({ redirectPath: ROUTES.COMPLEX_CLASSES });
  const { error: formError, validate, clear: clearError } = useFormError();

  const { data: classData } = useApiQuery(
    ['class', seq],
    () => classApi.get(seq),
  );

  useEffect(() => {
    if (classData) {
      setForm({
        name: classData.name,
        timeSlotSeq: classData.timeSlotSeq ?? '',
        capacity: classData.capacity,
        description: classData.description ?? '',
      });
    }
  }, [classData]);

  const handleSubmit = async () => {
    if (!validate(validateClassForm(form))) return;
    clearError();
    await run(classApi.update(seq, {
      name: form.name,
      description: form.description || undefined,
      capacity: form.capacity,
      timeSlotSeq: form.timeSlotSeq as number,
    }), '수업이 수정되었습니다.');
  };

  return (
    <>
      <ClassForm
        form={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        isEdit
        backHref={ROUTES.COMPLEX_CLASSES}
        submitLabel="수정"
        timeSlots={timeSlots}
        formError={formError}
      />
      {modal}
    </>
  );
}
