'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { branchApi } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import BranchForm, { emptyBranchForm, validateBranchForm, type BranchFormData } from '../BranchForm';

export default function BranchAddPage() {
  const router = useRouter();
  const refreshBranches = useSessionStore((s) => s.refreshBranches);
  const [form, setForm] = useState<BranchFormData>(emptyBranchForm);

  const handleSubmit = async () => {
    const error = validateBranchForm(form);
    if (error) { alert(error); return; }
    await branchApi.create(form);
    await refreshBranches();
    router.push('/branches');
  };

  return (
    <BranchForm
      form={form}
      onChange={setForm}
      onSubmit={handleSubmit}
      backHref="/branches"
      backLabel="← 목록으로"
      cancelHref="/branches"
    />
  );
}
