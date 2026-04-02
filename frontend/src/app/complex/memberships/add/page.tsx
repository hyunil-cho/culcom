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
import ResultModal from '@/components/ui/ResultModal';

export default function MembershipAddPage() {
  const [form, setForm] = useState<MembershipFormData>(emptyMembershipForm);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async () => {
    const error = validateMembershipForm(form);
    if (error) { alert(error); return; }
    const res = await membershipApi.create({
      name: form.name,
      duration: toDurationDays(form),
      count: form.count,
      price: form.price,
    });
    if (res.success) {
      setResult({ success: true, message: '멤버십이 등록되었습니다.' });
    }
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
      {result && (
        <ResultModal
          success={result.success}
          message={result.message}
          redirectPath={ROUTES.COMPLEX_MEMBERSHIPS}
        />
      )}
    </>
  );
}
