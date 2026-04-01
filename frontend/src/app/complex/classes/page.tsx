'use client';

import { useEffect, useState } from 'react';
import { classApi, type ComplexClass } from '@/lib/api';
import ResultModal from '@/components/ui/ResultModal';
import DataTable, { type Column } from '@/components/ui/DataTable';

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

  const columns: Column<ComplexClass>[] = [
    { header: '수업명', render: (c) => c.name },
    { header: '설명', render: (c) => c.description ?? '-' },
    { header: '정원', render: (c) => c.capacity },
    { header: '순서', render: (c) => c.sortOrder },
    { header: '관리', render: (c) => (
      <button className="btn-table-delete" onClick={() => handleDelete(c.seq)}>삭제</button>
    )},
  ];

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>수업 관리</h2>
        <button className="btn-primary">+ 수업 추가</button>
      </div>

      <DataTable
        columns={columns}
        data={classes}
        rowKey={(c) => c.seq}
      />

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
