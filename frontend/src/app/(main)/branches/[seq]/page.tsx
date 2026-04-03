'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { branchApi, SessionRole, type Branch } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import { ROUTES } from '@/lib/routes';
import DetailCard from '@/components/ui/DetailCard';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ResultModal from '@/components/ui/ResultModal';

export default function BranchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const seq = Number(params.seq);
  const session = useSessionStore((s) => s.session);
  const refreshBranches = useSessionStore((s) => s.refreshBranches);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    branchApi.get(seq).then(res => setBranch(res.data));
  }, [seq]);

  if (!branch) return null;

  return (
    <>
      <div className="detail-actions">
        <Link href={ROUTES.BRANCHES} className="btn-back">← 목록으로</Link>
        {SessionRole.isManager(session) && (
          <div className="action-group" style={{ display: 'flex', gap: 8 }}>
            <Link href={ROUTES.BRANCH_EDIT(seq)} className="btn-primary btn-nav">수정</Link>
            <button className="btn-secondary" style={{ color: 'var(--danger)' }} onClick={() => setDeleting(true)}>삭제</button>
          </div>
        )}
      </div>

      <DetailCard
        title="기본 정보"
        fields={[
          { label: '지점명', value: <strong>{branch.branchName}</strong> },
          { label: '영문코드', value: branch.alias },
          { label: '매니저', value: branch.branchManager ?? '-' },
          { label: '주소', value: branch.address ?? '-' },
          { label: '오시는 길', value: branch.directions ?? '-', preWrap: true },
        ]}
      />

      {deleting && (
        <ConfirmModal
          title="삭제 확인"
          onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            const res = await branchApi.delete(seq);
            setDeleting(false);
            if (res.success) setResult({ success: true, message: '지점이 삭제되었습니다.' });
          }}
          confirmLabel="삭제"
          confirmColor="#f44336"
        >
          <strong>{branch.branchName}</strong> 지점을 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.
        </ConfirmModal>
      )}

      {result && (
        <ResultModal
          success={result.success}
          message={result.message}
          onConfirm={async () => { setResult(null); await refreshBranches(); router.push(ROUTES.BRANCHES); }}
        />
      )}
    </>
  );
}
