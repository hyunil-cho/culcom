'use client';

import { useEffect, useState } from 'react';
import { classApi, timeslotApi, staffApi, type ClassTimeSlot, type ComplexStaff } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import ClassForm, { emptyClassForm, validateClassForm, type ClassFormData } from '../ClassForm';
import { useResultModal } from '@/hooks/useResultModal';

export default function ClassAddPage() {
  const [form, setForm] = useState<ClassFormData>(emptyClassForm);
  const [timeSlots, setTimeSlots] = useState<ClassTimeSlot[]>([]);
  const [staffs, setStaffs] = useState<ComplexStaff[]>([]);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.COMPLEX_CLASSES });

  useEffect(() => {
    timeslotApi.list().then(res => setTimeSlots(res.data));
    staffApi.list().then(res => setStaffs(res.data));
  }, []);

  const handleSubmit = async () => {
    const error = validateClassForm(form);
    if (error) { alert(error); return; }
    await run(classApi.create({
      name: form.name,
      description: form.description || undefined,
      capacity: form.capacity,
      timeSlotSeq: form.timeSlotSeq as number,
      staffSeq: form.staffSeq ? (form.staffSeq as number) : undefined,
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
        staffs={staffs}
      />
      {modal}
    </>
  );
}
