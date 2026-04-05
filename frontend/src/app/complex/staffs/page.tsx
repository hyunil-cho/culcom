'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { staffApi, type ComplexStaff } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import AttendanceHistoryModal from '@/components/ui/AttendanceHistoryModal';

export default function StaffsPage() {
  const router = useRouter();
  const [staffs, setStaffs] = useState<ComplexStaff[]>([]);
  const [historyModal, setHistoryModal] = useState<{ seq: number; name: string } | null>(null);

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
    {
      header: '히스토리', render: (s) => (
        <button onClick={(e) => { e.stopPropagation(); setHistoryModal({ seq: s.seq, name: s.name }); }}
          style={{ background: '#4a90e2', color: '#fff', border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}>
          히스토리
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>스태프 관리</h2>
        <Button onClick={() => router.push(ROUTES.COMPLEX_STAFFS_ADD)}>+ 스태프 추가</Button>
      </div>

      <DataTable
        columns={columns}
        data={staffs}
        rowKey={(s) => s.seq}
        onRowClick={(s) => router.push(ROUTES.COMPLEX_STAFF_EDIT(s.seq))}
      />

      {historyModal && (
        <AttendanceHistoryModal
          seq={historyModal.seq}
          name={historyModal.name}
          type="staff"
          onClose={() => setHistoryModal(null)}
        />
      )}
    </>
  );
}
