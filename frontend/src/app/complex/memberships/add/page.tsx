'use client';

import { useState } from 'react';
import { membershipApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import MembershipForm, {
  emptyMembershipForm,
  validateMembershipForm,
  toDurationDays,
  type MembershipFormData,
} from '../MembershipForm';
import { useResultModal } from '@/hooks/useResultModal';

export default function MembershipAddPage() {
  const [form, setForm] = useState<MembershipFormData>(emptyMembershipForm);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.COMPLEX_MEMBERSHIPS });

  const handleSubmit = async () => {
    const error = validateMembershipForm(form);
    if (error) { alert(error); return; }
    await run(membershipApi.create({
      name: form.name,
      duration: toDurationDays(form),
      count: form.count,
      price: form.price,
    }), '멤버십이 등록되었습니다.');
  };

  return (
    <>
      <MembershipForm
        form={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        backHref={ROUTES.COMPLEX_MEMBERSHIPS}
        submitLabel="등록"
      />
      {modal}
    </>
  );
}
