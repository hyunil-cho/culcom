'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { branchApi } from '@/lib/api';
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
