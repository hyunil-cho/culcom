'use client';

import { useState } from 'react';
import { branchApi } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import { ROUTES } from '@/lib/routes';
import BranchForm, { emptyBranchForm, validateBranchForm, type BranchFormData } from '../BranchForm';
import { useResultModal } from '@/hooks/useResultModal';
import { useFormError } from '@/hooks/useFormError';

export default function BranchAddPage() {
  const refreshBranches = useSessionStore((s) => s.refreshBranches);
  const [form, setForm] = useState<BranchFormData>(emptyBranchForm);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.BRANCHES, invalidateKeys: ['branches'] });
  const { error: formError, validate, clear: clearError } = useFormError();

  const handleSubmit = async () => {
    if (!validate(validateBranchForm(form))) return;
    clearError();
    const res = await run(branchApi.create(form), '지점이 등록되었습니다.');
    if (res.success) await refreshBranches();
  };

  return (
    <>
      <BranchForm
        form={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        backHref={ROUTES.BRANCHES}
        backLabel="← 목록으로"
        formError={formError}
      />
      {modal}
    </>
  );
}
