'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { staffApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import StaffForm, { emptyStaffForm, validateStaffForm, type StaffFormData } from '../../StaffForm';
import ResultModal from '@/components/ui/ResultModal';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function StaffEditPage() {
  const params = useParams();
  const router = useRouter();
  const seq = Number(params.seq);
  const [form, setForm] = useState<StaffFormData>(emptyStaffForm);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    staffApi.get(seq).then(res => {
      const s = res.data;
      setForm({
        name: s.name,
        phoneNumber: s.phoneNumber ?? '',
        email: s.email ?? '',
        subject: s.subject ?? '',
        status: s.status,
      });
    });
  }, [seq]);

  const handleSubmit = async () => {
    const error = validateStaffForm(form);
    if (error) { alert(error); return; }
    const res = await staffApi.update(seq, {
      name: form.name,
      phoneNumber: form.phoneNumber || undefined,
      email: form.email || undefined,
      subject: form.subject || undefined,
      status: form.status,
    });
    if (res.success) setResult({ success: true, message: '스태프 정보가 수정되었습니다.' });
  };

  return (
    <>
      <StaffForm form={form} onChange={setForm} onSubmit={handleSubmit}
        isEdit backHref={ROUTES.COMPLEX_STAFFS} submitLabel="수정" />
      {deleting && (
        <ConfirmModal title="삭제 확인" onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            const res = await staffApi.delete(seq);
            setDeleting(false);
            if (res.success) setResult({ success: true, message: '스태프가 삭제되었습니다.' });
          }} confirmLabel="삭제" confirmColor="#f44336">
          이 스태프를 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.
        </ConfirmModal>
      )}
      {result && <ResultModal success={result.success} message={result.message} redirectPath={ROUTES.COMPLEX_STAFFS} />}
    </>
  );
}
