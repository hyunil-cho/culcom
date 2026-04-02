'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { classApi, timeslotApi, staffApi, type ClassTimeSlot, type ComplexStaff } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import ClassForm, { emptyClassForm, validateClassForm, type ClassFormData } from '../../ClassForm';
import ResultModal from '@/components/ui/ResultModal';

export default function ClassEditPage() {
  const params = useParams();
  const seq = Number(params.seq);
  const [form, setForm] = useState<ClassFormData>(emptyClassForm);
  const [timeSlots, setTimeSlots] = useState<ClassTimeSlot[]>([]);
  const [staffs, setStaffs] = useState<ComplexStaff[]>([]);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    Promise.all([
      classApi.get(seq),
      timeslotApi.list(),
      staffApi.list(),
    ]).then(([classRes, tsRes, staffRes]) => {
      const c = classRes.data;
      setForm({
        name: c.name,
        timeSlotSeq: c.timeSlot?.seq ?? '',
        staffSeq: c.staff?.seq ?? '',
        capacity: c.capacity,
        description: c.description ?? '',
        sortOrder: c.sortOrder,
      });
      setTimeSlots(tsRes.data);
      setStaffs(staffRes.data);
    });
  }, [seq]);

  const handleSubmit = async () => {
    const error = validateClassForm(form);
    if (error) { alert(error); return; }
    const res = await classApi.update(seq, {
      name: form.name,
      description: form.description || undefined,
      capacity: form.capacity,
      sortOrder: form.sortOrder,
      timeSlot: { seq: form.timeSlotSeq as number } as any,
      staff: form.staffSeq ? { seq: form.staffSeq as number } as any : undefined,
    });
    if (res.success) {
      setResult({ success: true, message: '수업이 수정되었습니다.' });
    }
  };

  return (
    <>
      <ClassForm
        form={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        backHref={ROUTES.COMPLEX_CLASSES}
        submitLabel="수정"
        timeSlots={timeSlots}
        staffs={staffs}
      />
      {result && (
        <ResultModal success={result.success} message={result.message} redirectPath={ROUTES.COMPLEX_CLASSES} />
      )}
    </>
  );
}
