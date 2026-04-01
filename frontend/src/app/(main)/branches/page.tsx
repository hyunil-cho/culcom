'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { branchApi, type Branch } from '@/lib/api';

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ branchName: '', alias: '', branchManager: '', address: '' });

  useEffect(() => {
    branchApi.list().then(res => setBranches(res.data));
  }, []);

  const handleCreate = async () => {
    await branchApi.create(form);
    setShowForm(false);
    setForm({ branchName: '', alias: '', branchManager: '', address: '' });
    branchApi.list().then(res => setBranches(res.data));
  };

  const handleDelete = async (seq: number) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      await branchApi.delete(seq);
      branchApi.list().then(res => setBranches(res.data));
    }
  };

  return (
    <AppLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>지점 관리</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '취소' : '+ 지점 추가'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input placeholder="지점명" value={form.branchName}
                   onChange={(e) => setForm({...form, branchName: e.target.value})} />
            <input placeholder="별칭 (URL)" value={form.alias}
                   onChange={(e) => setForm({...form, alias: e.target.value})} />
            <input placeholder="담당자" value={form.branchManager}
                   onChange={(e) => setForm({...form, branchManager: e.target.value})} />
            <input placeholder="주소" value={form.address}
                   onChange={(e) => setForm({...form, address: e.target.value})} />
          </div>
          <button className="btn-primary" onClick={handleCreate} style={{ marginTop: 12 }}>저장</button>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>지점명</th>
              <th>별칭</th>
              <th>담당자</th>
              <th>주소</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.seq}>
                <td>{b.branchName}</td>
                <td>{b.alias}</td>
                <td>{b.branchManager ?? '-'}</td>
                <td>{b.address ?? '-'}</td>
                <td>
                  <button className="btn-danger" style={{ fontSize: 12, padding: '4px 8px' }}
                          onClick={() => handleDelete(b.seq)}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
