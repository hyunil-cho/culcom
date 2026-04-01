'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { branchApi } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import BranchForm, { emptyBranchForm, validateBranchForm, type BranchFormData } from '../../BranchForm';

export default function BranchEditPage() {
  const params = useParams();
  const router = useRouter();
  const seq = Number(params.seq);
  const refreshBranches = useSessionStore((s) => s.refreshBranches);
  const [form, setForm] = useState<BranchFormData>(emptyBranchForm);

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
    await branchApi.update(seq, form);
    await refreshBranches();
    router.push(`/branches/${seq}`);
  };

  return (
    <BranchForm
      form={form}
      onChange={setForm}
      onSubmit={handleSubmit}
      backHref={`/branches/${seq}`}
      backLabel="← 상세로"
      cancelHref={`/branches/${seq}`}
      seq={seq}
    />
  );
}
