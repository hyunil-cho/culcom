'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { branchApi } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useSessionStore } from '@/lib/store';
import { ROUTES } from '@/lib/routes';
import BranchForm, { emptyBranchForm, validateBranchForm, type BranchFormData } from '../../BranchForm';
import { useResultModal } from '@/hooks/useResultModal';

export default function BranchEditPage() {
  const params = useParams();
  const seq = Number(params.seq);
  const refreshBranches = useSessionStore((s) => s.refreshBranches);
  const [form, setForm] = useState<BranchFormData>(emptyBranchForm);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.BRANCH_DETAIL(seq) });

  const { data: branchData } = useApiQuery(
    ['branch', seq],
    () => branchApi.get(seq),
  );

  useEffect(() => {
    if (branchData) {
      setForm({
        branchName: branchData.branchName,
        alias: branchData.alias,
        branchManager: branchData.branchManager ?? '',
        address: branchData.address ?? '',
        directions: branchData.directions ?? '',
      });
    }
  }, [branchData]);

  const handleSubmit = async () => {
    const error = validateBranchForm(form);
    if (error) { alert(error); return; }
    const res = await run(branchApi.update(seq, form), '지점 정보가 수정되었습니다.');
    if (res.success) await refreshBranches();
  };

  return (
    <>
      <BranchForm
        form={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        backHref={ROUTES.BRANCH_DETAIL(seq)}
        backLabel="← 상세로"
        seq={seq}
      />
      {modal}
    </>
  );
}
