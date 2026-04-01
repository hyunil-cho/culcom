'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { branchApi, SessionRole, type Branch } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import DetailCard from '@/components/ui/DetailCard';

export default function BranchDetailPage() {
  const params = useParams();
  const seq = Number(params.seq);
  const session = useSessionStore((s) => s.session);
  const [branch, setBranch] = useState<Branch | null>(null);

  useEffect(() => {
    branchApi.get(seq).then(res => setBranch(res.data));
  }, [seq]);

  if (!branch) return null;

  return (
    <>
      <div className="detail-actions">
        <Link href="/branches" className="btn-back">← 목록으로</Link>
        {SessionRole.isManager(session) && (
          <div className="action-group">
            <Link href={`/branches/${seq}/edit`} className="btn-primary btn-nav">수정</Link>
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
    </>
  );
}
