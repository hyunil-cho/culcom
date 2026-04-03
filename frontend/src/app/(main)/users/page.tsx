'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { userApi, SessionRole, type UserResponse } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { ROUTES } from '@/lib/routes';
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

  const load = () => { userApi.list().then(res => setUsers(res.data)); };

  useEffect(() => { load(); }, []);

  const creatingRole = SessionRole.isRoot(session) ? '지점장' : '직원';

  const userColumns: Column<UserResponse>[] = [
    { header: '아이디', render: (u) => <strong>{u.userId}</strong> },
    { header: '이름', render: (u) => maskName(u.name) },
    { header: '역할', render: (u) => <span className="status-badge status-active">{ROLE_LABELS[u.role] ?? u.role}</span> },
    { header: '생성일', render: (u) => u.createdDate },
  ];

  return (
    <>
      <div className="content-card action-bar">
        <div className="search-section">
          <div className="action-buttons">
            {SessionRole.canManageUsers(session) && (
              <button className="btn-primary btn-nav" onClick={() => router.push(ROUTES.USERS_CREATE)}>
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
        onRowClick={(u) => router.push(ROUTES.USER_EDIT(u.seq))}
      />

    </>
  );
}
