'use client';

import { useState } from 'react';
import { branchApi } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import { ROUTES } from '@/lib/routes';
import BranchForm, { emptyBranchForm, validateBranchForm, type BranchFormData } from '../BranchForm';
import ResultModal from '@/components/ui/ResultModal';

export default function BranchAddPage() {
  const refreshBranches = useSessionStore((s) => s.refreshBranches);
  const [form, setForm] = useState<BranchFormData>(emptyBranchForm);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async () => {
    const error = validateBranchForm(form);
    if (error) { alert(error); return; }
    const res = await branchApi.create(form);
    if (res.success) {
      await refreshBranches();
      setResult({ success: true, message: '지점이 등록되었습니다.' });
    }
  };

  return (
    <>
      <BranchForm
        form={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        backHref={ROUTES.BRANCHES}
        backLabel="← 목록으로"
        cancelHref={ROUTES.BRANCHES}
      />
      {result && (
        <ResultModal
          success={result.success}
          message={result.message}
          redirectPath={ROUTES.BRANCHES}
        />
      )}
    </>
  );
}
