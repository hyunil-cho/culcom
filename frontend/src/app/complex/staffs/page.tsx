'use client';

import { useEffect, useState } from 'react';
import { staffApi, type ComplexStaff } from '@/lib/api';
import DataTable, { type Column } from '@/components/ui/DataTable';

export default function StaffsPage() {
  const [staffs, setStaffs] = useState<ComplexStaff[]>([]);

  useEffect(() => {
    staffApi.list().then(res => setStaffs(res.data));
  }, []);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      '재직': 'badge-success', '휴직': 'badge-warning', '퇴직': 'badge-danger',
    };
    return <span className={`badge ${map[status] ?? ''}`}>{status}</span>;
  };

  const columns: Column<ComplexStaff>[] = [
    { header: '이름', render: (s) => s.name },
    { header: '전화번호', render: (s) => s.phoneNumber ?? '-' },
    { header: '이메일', render: (s) => s.email ?? '-' },
    { header: '담당 과목', render: (s) => s.subject ?? '-' },
    { header: '상태', render: (s) => statusBadge(s.status) },
  ];

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>스태프 관리</h2>
        <button className="btn-primary">+ 스태프 추가</button>
      </div>

      <DataTable
        columns={columns}
        data={staffs}
        rowKey={(s) => s.seq}
      />
    </>
  );
}
