'use client';

import { useSessionStore } from '@/lib/store';

export default function ComplexDashboardPage() {
  const session = useSessionStore((s) => s.session);
  const branches = useSessionStore((s) => s.branches);

  const selectedBranch = branches.find((b) => b.seq === session?.selectedBranchSeq);

  return (
    <>
      <div className="content-header">
        <h1>컴플렉스 대시보드</h1>
        <p>{selectedBranch?.branchName ?? '-'} 지점의 수업 현황 및 통계입니다.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="content-card">
          <h3>지점 요약</h3>
          <div style={{ marginTop: 20 }}>
            <p><strong>담당자:</strong> {selectedBranch?.branchManager ?? '-'}</p>
            <p><strong>주소:</strong> {selectedBranch?.address ?? '-'}</p>
          </div>
        </div>
      </div>
    </>
  );
}
