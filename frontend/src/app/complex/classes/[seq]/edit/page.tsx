'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { classApi, staffApi, type ComplexStaff } from '@/lib/api';
import { useClassSlots } from '../../../hooks/useClassSlots';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { ROUTES } from '@/lib/routes';
import ClassForm, { emptyClassForm, validateClassForm, type ClassFormData } from '../../ClassForm';
import { useResultModal } from '@/hooks/useResultModal';

export default function ClassEditPage() {
  const params = useParams();
  const router = useRouter();
  const seq = Number(params.seq);
  const [form, setForm] = useState<ClassFormData>(emptyClassForm);
  const { timeSlots } = useClassSlots();
  const [staffs, setStaffs] = useState<ComplexStaff[]>([]);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.COMPLEX_CLASSES });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      classApi.get(seq),
      staffApi.list(),
    ]).then(([classRes, staffRes]) => {
      const c = classRes.data;
      setForm({
        name: c.name,
        timeSlotSeq: c.timeSlotSeq ?? '',
        staffSeq: c.staffSeq ?? '',
        capacity: c.capacity,
        description: c.description ?? '',
        sortOrder: c.sortOrder,
      });
      setStaffs(staffRes.data);
    });
  }, [seq]);

  const handleSubmit = async () => {
    const error = validateClassForm(form);
    if (error) { alert(error); return; }
    await run(classApi.update(seq, {
      name: form.name,
      description: form.description || undefined,
      capacity: form.capacity,
      sortOrder: form.sortOrder,
      timeSlotSeq: form.timeSlotSeq as number,
      staffSeq: form.staffSeq ? (form.staffSeq as number) : undefined,
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
        staffs={staffs}
      />
      {deleting && (
        <ConfirmModal
          title="삭제 확인"
          onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            setDeleting(false);
            await run(classApi.delete(seq), '수업이 삭제되었습니다.');
          }}
          confirmLabel="삭제"
          confirmColor="#f44336"
        >
          이 수업을 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.
        </ConfirmModal>
      )}
      {modal}
    </>
  );
}
