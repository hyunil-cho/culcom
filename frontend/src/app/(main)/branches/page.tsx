'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { branchApi, SessionRole, type Branch } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import { useApiQuery } from '@/hooks/useApiQuery';
import ResultModal from '@/components/ui/ResultModal';
import { ROUTES } from '@/lib/routes';
import DataTable, { type Column } from '@/components/ui/DataTable';

export default function BranchesPage() {
  const session = useSessionStore((s) => s.session);
  const refreshBranches = useSessionStore((s) => s.refreshBranches);
  const router = useRouter();
  const canEdit = SessionRole.isManager(session);

  const { data: branches = [] } = useApiQuery<Branch[]>(['branches'], () => branchApi.list());

  const branchColumns: Column<Branch>[] = [
    { header: '지점명', render: (b) => <strong>{b.branchName}</strong> },
    { header: '영문코드', render: (b) => <span className="status-badge status-active">{b.alias}</span> },
    { header: '담당자', render: (b) => b.branchManager ?? '-' },
    { header: '등록일', render: (b) => b.createdDate ?? '-' },
  ];


  return (
    <>
      {canEdit && (
        <div className="content-card action-bar">
          <div className="search-section">
            <div className="action-buttons">
              <Link href={ROUTES.BRANCHES_ADD} className="btn-primary btn-nav">+ 지점 추가</Link>
            </div>
          </div>
        </div>
      )}

      <DataTable
        columns={branchColumns}
        data={branches}
        rowKey={(b) => b.seq}
        headerInfo={<span>총 <strong>{branches.length}</strong>개 지점</span>}
        onRowClick={(b) => router.push(ROUTES.BRANCH_DETAIL(b.seq))}
      />

    </>
  );
}
