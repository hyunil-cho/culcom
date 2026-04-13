'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { classApi, type ComplexClass } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/Button';
import ResultModal from '@/components/ui/ResultModal';
import SearchBar from '@/components/ui/SearchBar';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { useListPageQuery } from '@/hooks/useListPageQuery';
import { useModal } from '@/hooks/useModal';

export default function ClassesPage() {
  const router = useRouter();
  const list = useListPageQuery<ComplexClass>('classes', (q) => classApi.list(q));
  const [keyword, setKeyword] = useState('');
  const resultModal = useModal<{ success: boolean; message: string }>();

  const handleSearch = () => { list.load(0, { keyword }); };


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
        onReset={keyword ? () => { setKeyword(''); list.load(0); } : undefined}
        placeholder="수업명, 강사, 시간대 검색"
      />

      <DataTable
        columns={columns}
        data={list.items}
        rowKey={(c) => c.seq}
        emptyMessage="등록된 수업이 없습니다."
        pagination={list.pagination}
        onRowClick={(c) => router.push(ROUTES.COMPLEX_CLASS_EDIT(c.seq))}
      />

      {resultModal.isOpen && (
        <ResultModal
          success={resultModal.data!.success}
          message={resultModal.data!.message}
          onConfirm={() => { resultModal.close(); list.load(list.pagination.page); }}
        />
      )}
    </>
  );
}
