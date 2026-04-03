'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { memberApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import MemberForm, { emptyMemberForm, validateMemberForm, type MemberFormData } from '../../MemberForm';
import ResultModal from '@/components/ui/ResultModal';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function MemberEditPage() {
  const params = useParams();
  const router = useRouter();
  const seq = Number(params.seq);
  const [form, setForm] = useState<MemberFormData>(emptyMemberForm);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    memberApi.get(seq).then(res => {
      const m = res.data;
      setForm({
        name: m.name,
        phoneNumber: m.phoneNumber,
        level: m.level ?? '',
        language: m.language ?? '',
        chartNumber: m.chartNumber ?? '',
        comment: m.comment ?? '',
      });
    });
  }, [seq]);

  const handleSubmit = async () => {
    const error = validateMemberForm(form);
    if (error) { alert(error); return; }
    const res = await memberApi.update(seq, {
      name: form.name,
      phoneNumber: form.phoneNumber,
      level: form.level || undefined,
      language: form.language || undefined,
      chartNumber: form.chartNumber || undefined,
      comment: form.comment || undefined,
    });
    if (res.success) setResult({ success: true, message: '회원 정보가 수정되었습니다.' });
  };

  return (
    <>
      <MemberForm form={form} onChange={setForm} onSubmit={handleSubmit}
        isEdit backHref={ROUTES.COMPLEX_MEMBERS} submitLabel="수정" />
      {deleting && (
        <ConfirmModal title="삭제 확인" onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            const res = await memberApi.delete(seq);
            setDeleting(false);
            if (res.success) setResult({ success: true, message: '회원이 삭제되었습니다.' });
          }} confirmLabel="삭제" confirmColor="#f44336">
          이 회원을 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.
        </ConfirmModal>
      )}
      {result && <ResultModal success={result.success} message={result.message} redirectPath={ROUTES.COMPLEX_MEMBERS} />}
    </>
  );
}
