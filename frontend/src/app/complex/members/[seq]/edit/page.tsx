'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { memberApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import MemberForm, { emptyMemberForm, validateMemberForm, type MemberFormData } from '../../MemberForm';
import { useResultModal } from '@/hooks/useResultModal';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function MemberEditPage() {
  const params = useParams();
  const router = useRouter();
  const seq = Number(params.seq);
  const [form, setForm] = useState<MemberFormData>(emptyMemberForm);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.COMPLEX_MEMBERS });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    memberApi.get(seq).then(res => {
      const m = res.data;
      setForm({
        name: m.name,
        phoneNumber: m.phoneNumber,
        level: m.level ?? '',
        language: m.language ?? '',
        info: m.info ?? '',
        chartNumber: m.chartNumber ?? '',
        signupChannel: m.signupChannel ?? '',
        interviewer: m.interviewer ?? '',
        comment: m.comment ?? '',
      });
    });
  }, [seq]);

  const handleSubmit = async () => {
    const error = validateMemberForm(form);
    if (error) { alert(error); return; }
    await run(memberApi.update(seq, {
      name: form.name,
      phoneNumber: form.phoneNumber,
      level: form.level || undefined,
      language: form.language || undefined,
      info: form.info || undefined,
      chartNumber: form.chartNumber || undefined,
      signupChannel: (form.signupChannel && form.signupChannel !== '기타') ? form.signupChannel : undefined,
      interviewer: form.interviewer || undefined,
      comment: form.comment || undefined,
    }), '회원 정보가 수정되었습니다.');
  };

  return (
    <>
      <MemberForm form={form} onChange={setForm} onSubmit={handleSubmit}
        isEdit backHref={ROUTES.COMPLEX_MEMBERS} submitLabel="수정" />
      {deleting && (
        <ConfirmModal title="삭제 확인" onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            setDeleting(false);
            await run(memberApi.delete(seq), '회원이 삭제되었습니다.');
          }} confirmLabel="삭제" confirmColor="#f44336">
          이 회원을 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.
        </ConfirmModal>
      )}
      {modal}
    </>
  );
}
