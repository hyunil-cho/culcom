'use client';

import { useEffect, useState } from 'react';
import { staffApi, type ComplexStaff } from '@/lib/api';

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

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>스태프 관리</h2>
        <button className="btn-primary">+ 스태프 추가</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>전화번호</th>
              <th>이메일</th>
              <th>담당 과목</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {staffs.map((s) => (
              <tr key={s.seq}>
                <td>{s.name}</td>
                <td>{s.phoneNumber ?? '-'}</td>
                <td>{s.email ?? '-'}</td>
                <td>{s.subject ?? '-'}</td>
                <td>{statusBadge(s.status)}</td>
              </tr>
            ))}
            {staffs.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                데이터가 없습니다.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
