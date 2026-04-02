'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { userApi, SessionRole, type UserResponse } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import ResultModal from '@/components/ui/ResultModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import DataTable, { type Column } from '@/components/ui/DataTable';
import {maskName} from "@/lib/commonUtils";

const ROLE_LABELS: Record<string, string> = {
  ROOT: '최고관리자',
  BRANCH_MANAGER: '지점장',
  STAFF: '직원',
};

export default function UsersPage() {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [deleting, setDeleting] = useState<UserResponse | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const load = () => { userApi.list().then(res => setUsers(res.data)); };

  useEffect(() => { load(); }, []);

  const confirmDelete = async () => {
    if (!deleting) return;
    const res = await userApi.delete(deleting.seq);
    setDeleting(null);
    if (res.success) setResult({ success: true, message: '사용자가 삭제되었습니다.' });
  };

  const creatingRole = SessionRole.isRoot(session) ? '지점장' : '직원';

  const userColumns: Column<UserResponse>[] = [
    { header: '아이디', render: (u) => <strong>{u.userId}</strong> },
    { header: '이름', render: (u) => maskName(u.name) },
    { header: '역할', render: (u) => <span className="status-badge status-active">{ROLE_LABELS[u.role] ?? u.role}</span> },
    { header: '생성일', render: (u) => u.createdDate },
    { header: '관리', render: (u) => u.role !== 'ROOT' ? (
      <button className="btn-table-delete" onClick={() => setDeleting(u)}>삭제</button>
    ) : null },
  ];

  return (
    <>
      <div className="content-card action-bar">
        <div className="search-section">
          <div className="action-buttons">
            {SessionRole.canManageUsers(session) && (
              <button className="btn-primary btn-nav" onClick={() => router.push('/users/create')}>
                + {creatingRole} 추가
              </button>
            )}
          </div>
        </div>
      </div>

      <DataTable
        columns={userColumns}
        data={users}
        rowKey={(u) => u.seq}
        headerInfo={<span>총 <strong>{users.length}</strong>명</span>}
      />

      {/* 삭제 확인 모달 */}
      {deleting && (
        <ConfirmModal
          title="삭제 확인"
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
          confirmLabel="삭제"
          confirmColor="#f44336"
        >
          <strong>{deleting.userId}</strong> ({ROLE_LABELS[deleting.role]}) 계정을 삭제하시겠습니까?
          <br /><br />이 작업은 되돌릴 수 없습니다.
        </ConfirmModal>
      )}

      {result && (
        <ResultModal
          success={result.success}
          message={result.message}
          onConfirm={() => { setResult(null); load(); }}
        />
      )}
    </>
  );
}
