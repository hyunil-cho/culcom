'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { classApi, type ComplexClass } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/Button';
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
      header: '담당 리더',
      render: (c) => c.staffName
        ? <span style={{ color: '#555', fontWeight: 600 }}>{c.staffName}</span>
        : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`${ROUTES.COMPLEX_CLASS_TEAMS}?classSeq=${c.seq}`);
            }}
            style={{
              background: 'transparent',
              border: '1px solid #4a90e2',
              color: '#4a90e2',
              borderRadius: 4,
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            등록하기
          </button>
        ),
    },
    {
      header: '시간대',
      render: (c) => c.timeSlotName
        ? <span className="badge badge-success">{c.timeSlotName}</span>
        : '-',
    },
    {
      header: '현재 인원',
      render: (c) => {
        const count = c.memberCount ?? 0;
        const full = c.capacity != null && count >= c.capacity;
        return (
            <>
              <span style={{ color: full ? '#e03131' : '#2b8a3e', fontWeight: 'bold' }}>{count}</span>명
            </>
        );
      },
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
        <Button onClick={() => router.push(ROUTES.COMPLEX_CLASSES_ADD)}>+ 수업 추가</Button>
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
        pagination={{ page, totalPages, onPageChange: handlePageChange }}
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
