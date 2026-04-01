'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { branchApi } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import BranchForm, { emptyBranchForm, validateBranchForm, type BranchFormData } from '../../BranchForm';
import ResultModal from '@/components/ui/ResultModal';

export default function BranchEditPage() {
  const params = useParams();
  const seq = Number(params.seq);
  const refreshBranches = useSessionStore((s) => s.refreshBranches);
  const [form, setForm] = useState<BranchFormData>(emptyBranchForm);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    branchApi.get(seq).then(res => {
      const b = res.data;
      setForm({
        branchName: b.branchName,
        alias: b.alias,
        branchManager: b.branchManager ?? '',
        address: b.address ?? '',
        directions: b.directions ?? '',
      });
    });
  }, [seq]);

  const handleSubmit = async () => {
    const error = validateBranchForm(form);
    if (error) { alert(error); return; }
    const res = await branchApi.update(seq, form);
    if (res.success) {
      await refreshBranches();
      setResult({ success: true, message: '지점 정보가 수정되었습니다.' });
    }
  };

  return (
    <>
      <BranchForm
        form={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        backHref={`/branches/${seq}`}
        backLabel="← 상세로"
        cancelHref={`/branches/${seq}`}
        seq={seq}
      />
      {result && (
        <ResultModal
          success={result.success}
          message={result.message}
          redirectPath={`/branches/${seq}`}
        />
      )}
    </>
  );
}
