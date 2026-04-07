'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { classApi } from '@/lib/api';
import { useClassSlots } from '../../../hooks/useClassSlots';
import { ROUTES } from '@/lib/routes';
import ClassForm, { emptyClassForm, validateClassForm, type ClassFormData } from '../../ClassForm';
import { useResultModal } from '@/hooks/useResultModal';

export default function ClassEditPage() {
  const params = useParams();
  const seq = Number(params.seq);
  const [form, setForm] = useState<ClassFormData>(emptyClassForm);
  const { timeSlots } = useClassSlots();
  const { run, modal } = useResultModal({ redirectPath: ROUTES.COMPLEX_CLASSES });

  useEffect(() => {
    classApi.get(seq).then(classRes => {
      const c = classRes.data;
      setForm({
        name: c.name,
        timeSlotSeq: c.timeSlotSeq ?? '',
        capacity: c.capacity,
        description: c.description ?? '',
      });
    });
  }, [seq]);

  const handleSubmit = async () => {
    const error = validateClassForm(form);
    if (error) { alert(error); return; }
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
      />
      {modal}
    </>
  );
}
