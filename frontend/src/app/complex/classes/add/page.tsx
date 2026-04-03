'use client';

import { useEffect, useState } from 'react';
import { classApi, timeslotApi, staffApi, type ClassTimeSlot, type ComplexStaff } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import ClassForm, { emptyClassForm, validateClassForm, type ClassFormData } from '../ClassForm';
import ResultModal from '@/components/ui/ResultModal';

export default function ClassAddPage() {
  const [form, setForm] = useState<ClassFormData>(emptyClassForm);
  const [timeSlots, setTimeSlots] = useState<ClassTimeSlot[]>([]);
  const [staffs, setStaffs] = useState<ComplexStaff[]>([]);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    timeslotApi.list().then(res => setTimeSlots(res.data));
    staffApi.list().then(res => setStaffs(res.data));
  }, []);

  const handleSubmit = async () => {
    const error = validateClassForm(form);
    if (error) { alert(error); return; }
    const res = await classApi.create({
      name: form.name,
      description: form.description || undefined,
      capacity: form.capacity,
      timeSlotSeq: form.timeSlotSeq as number,
      staffSeq: form.staffSeq ? (form.staffSeq as number) : undefined,
    });
    if (res.success) {
      setResult({ success: true, message: '수업이 등록되었습니다.' });
    }
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
      {result && (
        <ResultModal success={result.success} message={result.message} redirectPath={ROUTES.COMPLEX_CLASSES} />
      )}
    </>
  );
}
