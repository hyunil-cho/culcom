'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { classApi, type ComplexClass } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import ResultModal from '@/components/ui/ResultModal';
import SearchBar from '@/components/ui/SearchBar';
import DataTable, { type Column } from '@/components/ui/DataTable';

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ComplexClass[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const load = (p = page, kw = keyword) => {
    const params = [`page=${p}`, 'size=20'];
    if (kw) params.push(`keyword=${encodeURIComponent(kw)}`);
    classApi.list(params.join('&')).then(res => {
      setClasses(res.data.content);
      setTotalPages(res.data.totalPages);
    });
  };

  useEffect(() => { load(); }, []);

  const handleSearch = () => { setPage(0); load(0, keyword); };

  const handlePageChange = (p: number) => { setPage(p); load(p); };


  const columns: Column<ComplexClass>[] = [
    { header: '수업 이름', render: (c) => <strong>{c.name}</strong> },
    {
      header: '담당 강사',
      render: (c) => c.staff?.name
        ? <span style={{ color: '#555', fontWeight: 600 }}>{c.staff.name}</span>
        : <small style={{ color: '#ccc' }}>(미배정)</small>,
    },
    {
      header: '시간대',
      render: (c) => c.timeSlot
        ? <span className="badge badge-success">{c.timeSlot.name}</span>
        : '-',
    },
    {
      header: '정원',
      render: (c) => <><span style={{ color: '#4a90e2', fontWeight: 'bold' }}>{c.capacity}</span>명</>,
    },
    {
      header: '설명',
      render: (c) => (
        <span style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
          {c.description ?? '-'}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>수업 관리</h2>
        <button className="btn-primary" onClick={() => router.push(ROUTES.COMPLEX_CLASSES_ADD)}>+ 수업 추가</button>
      </div>

      <SearchBar
        keyword={keyword}
        onKeywordChange={setKeyword}
        onSearch={handleSearch}
        onReset={keyword ? () => { setKeyword(''); setPage(0); load(0, ''); } : undefined}
        placeholder="수업명, 강사, 시간대 검색"
      />

      <DataTable
        columns={columns}
        data={classes}
        rowKey={(c) => c.seq}
        emptyMessage="등록된 수업이 없습니다."
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onRowClick={(c) => router.push(ROUTES.COMPLEX_CLASS_EDIT(c.seq))}
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
