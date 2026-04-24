'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { classApi, type ComplexClass } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ResultModal from '@/components/ui/ResultModal';
import SearchBar from '@/components/ui/SearchBar';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { useListPageQuery } from '@/hooks/useListPageQuery';
import { useModal } from '@/hooks/useModal';
import { useResultModal } from '@/hooks/useResultModal';

export default function ClassesPage() {
  const router = useRouter();
  const list = useListPageQuery<ComplexClass>('classes', (q) => classApi.list(q));
  const [keyword, setKeyword] = useState('');
  const resultModal = useModal<{ success: boolean; message: string }>();
  const deleteModal = useModal<ComplexClass>();
  const { run, modal: resultModalNode } = useResultModal({ invalidateKeys: ['classes'] });

  const handleSearch = () => { list.load(0, { keyword }); };

  const handleDelete = async () => {
    if (!deleteModal.data) return;
    const target = deleteModal.data;
    deleteModal.close();
    await run(classApi.delete(target.seq), '팀이 삭제되었습니다.');
  };


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
    {
      header: '삭제',
      render: (c) => (
        <button
          className="btn-inline"
          style={{ background: '#ffebee', borderColor: '#f44336', color: '#d32f2f' }}
          onClick={(e) => { e.stopPropagation(); deleteModal.open(c); }}
        >
          삭제
        </button>
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
        emptyAction={<Button onClick={() => router.push(ROUTES.COMPLEX_CLASSES_ADD)}>+ 수업 추가</Button>}
        pagination={list.pagination}
        onRowClick={(c) => router.push(ROUTES.COMPLEX_CLASS_EDIT(c.seq))}
      />

      {deleteModal.isOpen && (
        <ConfirmModal
          title="팀 삭제"
          onCancel={deleteModal.close}
          onConfirm={handleDelete}
          confirmLabel="삭제"
          confirmColor="#f44336"
        >
          <p><strong>{deleteModal.data!.name}</strong> 팀을 삭제하시겠습니까?</p>
          <p style={{ color: '#dc2626', fontWeight: 600, marginTop: 8 }}>
            ⚠️ 등록된 회원이 있거나 리더가 배정된 팀은 삭제할 수 없습니다.
          </p>
        </ConfirmModal>
      )}

      {resultModalNode}

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
