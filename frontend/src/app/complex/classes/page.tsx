'use client';

import { useEffect, useState } from 'react';
import { classApi, type ComplexClass } from '@/lib/api';
import ResultModal from '@/components/ui/ResultModal';

export default function ClassesPage() {
  const [classes, setClasses] = useState<ComplexClass[]>([]);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => { load(); }, []);

  const load = () => { classApi.list().then(res => setClasses(res.data)); };

  const handleDelete = async (seq: number) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      const res = await classApi.delete(seq);
      if (res.success) setResult({ success: true, message: '수업이 삭제되었습니다.' });
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>수업 관리</h2>
        <button className="btn-primary">+ 수업 추가</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>수업명</th>
              <th>설명</th>
              <th>정원</th>
              <th>순서</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.seq}>
                <td>{c.name}</td>
                <td>{c.description ?? '-'}</td>
                <td>{c.capacity}</td>
                <td>{c.sortOrder}</td>
                <td>
                  <button className="btn-danger" style={{ fontSize: 12, padding: '4px 8px' }}
                          onClick={() => handleDelete(c.seq)}>삭제</button>
                </td>
              </tr>
            ))}
            {classes.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                데이터가 없습니다.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

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
