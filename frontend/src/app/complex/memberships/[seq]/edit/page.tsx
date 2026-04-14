'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { membershipApi } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { ROUTES } from '@/lib/routes';
import MembershipForm, {
  emptyMembershipForm,
  validateMembershipForm,
  toDurationDays,
  fromDurationDays,
  type MembershipFormData,
} from '../../MembershipForm';
import { useResultModal } from '@/hooks/useResultModal';
import { useFormError } from '@/hooks/useFormError';

export default function MembershipEditPage() {
  const params = useParams();
  const router = useRouter();
  const seq = Number(params.seq);
  const [form, setForm] = useState<MembershipFormData>(emptyMembershipForm);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.COMPLEX_MEMBERSHIPS });
  const { error: formError, validate, clear: clearError } = useFormError();

  const { data: membershipData } = useApiQuery(
    ['membership', seq],
    () => membershipApi.get(seq),
  );

  useEffect(() => {
    if (membershipData) {
      const dur = fromDurationDays(membershipData.duration);
      setForm({
        name: membershipData.name,
        durationValue: dur.value,
        durationUnit: dur.unit,
        count: membershipData.count,
        price: membershipData.price,
        transferable: membershipData.transferable,
      });
    }
  }, [membershipData]);

  const handleSubmit = async () => {
    if (!validate(validateMembershipForm(form))) return;
    clearError();
    await run(membershipApi.update(seq, {
      name: form.name,
      duration: toDurationDays(form),
      count: form.count,
      price: form.price,
      transferable: form.transferable,
    }), '멤버십이 수정되었습니다.');
  };

  return (
    <>
      <MembershipForm
        form={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        isEdit
        backHref={ROUTES.COMPLEX_MEMBERSHIPS}
        submitLabel="수정"
        formError={formError}
      />
      {/* 삭제 기능 비활성화
      {deleting && (
        <ConfirmModal
          title="삭제 확인"
          onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            setDeleting(false);
            await run(membershipApi.delete(seq), '멤버십이 삭제되었습니다.');
          }}
          confirmLabel="삭제"
          confirmColor="#f44336"
        >
          이 멤버십을 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.
        </ConfirmModal>
      )}
      */}
      {modal}
    </>
  );
}
