'use client';

import { useState } from 'react';
import { timeslotApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import TimeslotForm, {
  emptyTimeslotForm,
  validateTimeslotForm,
  toDaysOfWeek,
  type TimeslotFormData,
} from '../TimeslotForm';
import ResultModal from '@/components/ui/ResultModal';
import { useFormError } from '@/hooks/useFormError';

export default function TimeslotAddPage() {
  const [form, setForm] = useState<TimeslotFormData>(emptyTimeslotForm);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { error: formError, validate, clear: clearError } = useFormError();

  const handleSubmit = async () => {
    if (!validate(validateTimeslotForm(form))) return;
    clearError();
    const res = await timeslotApi.create({
      name: form.name,
      daysOfWeek: toDaysOfWeek(form.days),
      startTime: form.startTime,
      endTime: form.endTime,
    });
    if (res.success) {
      setResult({ success: true, message: '시간대가 등록되었습니다.' });
    }
  };

  return (
    <>
      <TimeslotForm
        form={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        backHref={ROUTES.COMPLEX_TIMESLOTS}
        submitLabel="등록"
        formError={formError}
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
