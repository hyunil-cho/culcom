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
import { useResultModal } from '@/hooks/useResultModal';
import { useFormError } from '@/hooks/useFormError';

export default function TimeslotAddPage() {
  const [form, setForm] = useState<TimeslotFormData>(emptyTimeslotForm);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.COMPLEX_TIMESLOTS, invalidateKeys: ['timeslots'] });
  const { error: formError, validate, clear: clearError } = useFormError();

  const handleSubmit = async () => {
    if (!validate(validateTimeslotForm(form))) return;
    clearError();
    await run(timeslotApi.create({
      name: form.name,
      daysOfWeek: toDaysOfWeek(form.days),
      startTime: form.startTime,
      endTime: form.endTime,
    }), '시간대가 등록되었습니다.');
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
      {modal}
    </>
  );
}
