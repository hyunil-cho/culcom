'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { branchApi, SessionRole, type Branch } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import ResultModal from '@/components/ui/ResultModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import DataTable, { type Column } from '@/components/ui/DataTable';

export default function BranchesPage() {
  const session = useSessionStore((s) => s.session);
  const refreshBranches = useSessionStore((s) => s.refreshBranches);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const router = useRouter();
  const canEdit = SessionRole.isManager(session);

  const load = () => { branchApi.list().then(res => setBranches(res.data)); };

  useEffect(() => { load(); }, []);

  const branchColumns: Column<Branch>[] = [
    { header: '지점명', render: (b) => <strong>{b.branchName}</strong> },
    { header: '영문코드', render: (b) => <span className="status-badge status-active">{b.alias}</span> },
    { header: '담당자', render: (b) => b.branchManager ?? '-' },
    { header: '등록일', render: (b) => b.createdDate ?? '-' },
    { header: '관리', render: (b) => canEdit ? (
      <div style={{ display: 'flex', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
        <Link href={`/branches/${b.seq}/edit`} className="btn-table-action">수정</Link>
        <button className="btn-table-delete" onClick={() => setDeleting(b.seq)}>삭제</button>
      </div>
    ) : null },
  ];

  const confirmDelete = async () => {
    if (deleting === null) return;
    const res = await branchApi.delete(deleting);
    setDeleting(null);
    if (res.success) setResult({ success: true, message: '지점이 삭제되었습니다.' });
  };

  return (
    <>
      {canEdit && (
        <div className="content-card action-bar">
          <div className="search-section">
            <div className="action-buttons">
              <Link href="/branches/add" className="btn-primary btn-nav">+ 지점 추가</Link>
            </div>
          </div>
        </div>
      )}

      <DataTable
        columns={branchColumns}
        data={branches}
        rowKey={(b) => b.seq}
        headerInfo={<span>총 <strong>{branches.length}</strong>개 지점</span>}
        onRowClick={(b) => router.push(`/branches/${b.seq}`)}
      />

      {deleting !== null && (
        <ConfirmModal
          title="삭제 확인"
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
          confirmLabel="삭제"
          confirmColor="#f44336"
        >
          <strong>{branches.find(b => b.seq === deleting)?.branchName}</strong> 지점을 삭제하시겠습니까?
          <br /><br />이 작업은 되돌릴 수 없습니다.
        </ConfirmModal>
      )}

      {result && (
        <ResultModal
          success={result.success}
          message={result.message}
          onConfirm={async () => { setResult(null); load(); await refreshBranches(); }}
        />
      )}
    </>
  );
}
