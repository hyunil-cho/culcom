'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { branchApi, SessionRole, type Branch } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import ResultModal from '@/components/ui/ResultModal';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function BranchesPage() {
  const session = useSessionStore((s) => s.session);
  const refreshBranches = useSessionStore((s) => s.refreshBranches);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const canEdit = SessionRole.isManager(session);

  const load = () => { branchApi.list().then(res => setBranches(res.data)); };

  useEffect(() => { load(); }, []);

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

      <div className="content-card">
        <div className="table-header">
          <div className="table-info">
            <span>총 <strong>{branches.length}</strong>개 지점</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>지점명</th>
              <th>영문코드</th>
              <th>담당자</th>
              <th>등록일</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.seq}>
                <td><strong>{b.branchName}</strong></td>
                <td><span className="status-badge status-active">{b.alias}</span></td>
                <td>{b.branchManager ?? '-'}</td>
                <td>{b.createdDate ?? '-'}</td>
                <td style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link href={`/branches/${b.seq}`} className="btn-table-action">상세</Link>
                  {canEdit && (
                    <>
                      <Link href={`/branches/${b.seq}/edit`} className="btn-table-action">수정</Link>
                      <button className="btn-table-delete" onClick={() => setDeleting(b.seq)}>
                        삭제
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
