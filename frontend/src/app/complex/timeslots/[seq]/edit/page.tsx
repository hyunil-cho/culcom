'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { timeslotApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import TimeslotForm, {
  emptyTimeslotForm,
  validateTimeslotForm,
  toDaysOfWeek,
  fromDaysOfWeek,
  type TimeslotFormData,
} from '../../TimeslotForm';
import ResultModal from '@/components/ui/ResultModal';

export default function TimeslotEditPage() {
  const params = useParams();
  const seq = Number(params.seq);
  const [form, setForm] = useState<TimeslotFormData>(emptyTimeslotForm);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    timeslotApi.list().then(res => {
      const slot = res.data.find(s => s.seq === seq);
      if (slot) {
        setForm({
          name: slot.name,
          days: fromDaysOfWeek(slot.daysOfWeek),
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      }
    });
  }, [seq]);

  const handleSubmit = async () => {
    const error = validateTimeslotForm(form);
    if (error) { alert(error); return; }
    const res = await timeslotApi.update(seq, {
      name: form.name,
      daysOfWeek: toDaysOfWeek(form.days),
      startTime: form.startTime,
      endTime: form.endTime,
    });
    if (res.success) {
      setResult({ success: true, message: '시간대가 수정되었습니다.' });
    }
  };

  return (
    <>
      <TimeslotForm
        form={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        backHref={ROUTES.COMPLEX_TIMESLOTS}
        submitLabel="수정"
      />
      {result && (
        <ResultModal
          success={result.success}
          message={result.message}
          redirectPath={ROUTES.COMPLEX_TIMESLOTS}
        />
      )}
    </>
  );
}
