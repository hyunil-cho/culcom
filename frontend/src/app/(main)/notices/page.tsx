'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { noticeApi, NoticeListItem } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { queryClient } from '@/lib/queryClient';
import { useQueryParams } from '@/lib/useQueryParams';
import DataTable from '@/components/ui/DataTable';
import SearchBar from '@/components/ui/SearchBar';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { ROUTES } from '@/lib/routes';
import { useResultModal } from '@/hooks/useResultModal';
import { useModal } from '@/hooks/useModal';
import { Button, LinkButton } from '@/components/ui/Button';

const CATEGORY_FILTERS = [
  { value: 'all', label: '전체' },
  { value: '공지사항', label: '공지사항' },
  { value: '이벤트', label: '이벤트' },
];

const DEFAULTS = { page: '0', filter: 'all', searchKeyword: '' };

export default function NoticesPage() {
  return <Suspense><NoticesContent /></Suspense>;
}

function NoticesContent() {
  const router = useRouter();
  const { params, setParams } = useQueryParams(DEFAULTS);
  const page = Number(params.page);
  const filter = params.filter;
  const searchKeyword = params.searchKeyword;

  const [keyword, setKeyword] = useState(searchKeyword);
  const deleteModal = useModal<NoticeListItem>();
  const { run, modal } = useResultModal();

  const noticeQueryKey = ['notices', { page, filter, searchKeyword }];
  const { data: noticeData } = useApiQuery<{ content: NoticeListItem[]; totalPages: number; totalElements: number }>(
    noticeQueryKey,
    () => {
      const apiParams = new URLSearchParams();
      apiParams.set('page', String(page));
      apiParams.set('size', '10');
      apiParams.set('filter', filter);
      if (searchKeyword) apiParams.set('searchKeyword', searchKeyword);
      return noticeApi.list(apiParams.toString());
    },
  );
  const notices = noticeData?.content ?? [];
  const totalPages = noticeData?.totalPages ?? 0;
  const totalElements = noticeData?.totalElements ?? 0;

  // searchKeyword가 URL에서 복원될 때 입력창도 동기화
  useEffect(() => {
    setKeyword(searchKeyword);
  }, [searchKeyword]);

  const handleSearch = () => {
    setParams({ page: '0', searchKeyword: keyword });
  };

  const handleReset = () => {
    setKeyword('');
    setParams({ page: '0', searchKeyword: '' });
  };

  const handleFilterChange = (f: string) => {
    setParams({ filter: f, page: '0' });
  };

  const handlePageChange = (p: number) => {
    setParams({ page: String(p) });
  };

  const handleDelete = async () => {
    if (!deleteModal.data) return;
    const target = deleteModal.data;
    deleteModal.close();
    const res = await run(noticeApi.delete(target.seq), '공지사항이 삭제되었습니다.');
    if (res.success) queryClient.invalidateQueries({ queryKey: ['notices'] });
  };

  const columns = [
    {
      header: '카테고리',
      render: (n: NoticeListItem) => (
        <span className={`status-badge ${n.category === '이벤트' ? 'status-warning' : 'status-active'}`}>
          {n.category}
        </span>
      ),
    },
    {
      header: '제목',
      render: (n: NoticeListItem) => (
        <span style={{ fontWeight: n.isPinned ? 700 : 400 }}>
          {n.isPinned && <span style={{ marginRight: 4 }}>📌</span>}
          {n.title}
        </span>
      ),
    },
    {
      header: '작성자',
      render: (n: NoticeListItem) => n.createdBy,
    },
    {
      header: '조회',
      render: (n: NoticeListItem) => n.viewCount,
    },
    {
      header: '이벤트 기간',
      render: (n: NoticeListItem) =>
        n.eventStartDate ? `${n.eventStartDate} ~ ${n.eventEndDate || ''}` : '-',
    },
    {
      header: '등록일',
      render: (n: NoticeListItem) => n.createdDate,
    }
  ];

  return (
    <>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>공지사항 · 이벤트 관리</h1>
        <LinkButton href={ROUTES.NOTICES_ADD} style={{ padding: '0.6rem 1.2rem' }}>
          새 글 작성
        </LinkButton>
      </div>

      {/* 카테고리 필터 */}
      <div className="content-card" style={{ marginBottom: '1rem', padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {CATEGORY_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? undefined : 'secondary'}
              style={{ padding: '6px 16px', fontSize: '0.85rem' }}
              onClick={() => handleFilterChange(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <SearchBar
        keyword={keyword}
        onKeywordChange={setKeyword}
        onSearch={handleSearch}
        onReset={keyword ? handleReset : undefined}
        placeholder="제목으로 검색..."
      />

      <DataTable
        columns={columns}
        data={notices}
        rowKey={(n) => n.seq}
        headerInfo={<>총 <strong>{totalElements}</strong>건{searchKeyword && <> · &quot;{searchKeyword}&quot; 검색 결과</>}</>}
        rowStyle={(n) => n.isPinned ? { background: '#fffde7' } : undefined}
        onRowClick={(n) => router.push(ROUTES.NOTICE_DETAIL(n.seq))}
        emptyMessage="등록된 게시글이 없습니다."
        pagination={{ page, totalPages, onPageChange: handlePageChange }}
      />

      {deleteModal.isOpen && (
        <ConfirmModal
          title="공지사항 삭제"
          onCancel={deleteModal.close}
          onConfirm={handleDelete}
          confirmLabel="삭제"
          confirmColor="var(--danger)"
        >
          <p>&quot;{deleteModal.data!.title}&quot;을(를) 삭제하시겠습니까?</p>
          <p style={{ fontSize: '0.85rem', color: '#999' }}>삭제된 게시글은 복구할 수 없습니다.</p>
        </ConfirmModal>
      )}

      {modal}
    </>
  );
}
