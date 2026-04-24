'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { memberApi, type ComplexMember } from '@/lib/api';
import type { PageResponse } from '@/lib/api/client';
import { ROUTES } from '@/lib/routes';
import { useQueryParams } from '@/lib/useQueryParams';
import { useApiQuery } from '@/hooks/useApiQuery';
import { Button } from '@/components/ui/Button';
import SearchBar from '@/components/ui/SearchBar';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { useMembership } from './useMembership';
import { useAttendanceHistory } from '@/lib/useAttendanceHistory';
import { useAttendanceHistoryColumn } from '@/hooks/useAttendanceHistoryColumn';

const DEFAULTS = { page: '0', keyword: '' };

export default function MembersPage() {
  return <Suspense><MembersContent /></Suspense>;
}

function MembersContent() {
  const router = useRouter();
  const { params, setParams } = useQueryParams(DEFAULTS);
  const page = Number(params.page);
  const searchedKeyword = params.keyword;

  const [keyword, setKeyword] = useState(searchedKeyword);
  const { openInfoModal, infoModal } = useMembership();
  const { column: historyColumn, modal: historyModal } = useAttendanceHistory<ComplexMember>('member');
  const recentHistoryColumn = useAttendanceHistoryColumn<ComplexMember>();

  const memberParams = new URLSearchParams({ page: String(page), size: '20' });
  if (searchedKeyword) memberParams.set('keyword', searchedKeyword);
  const { data: pageData } = useApiQuery<PageResponse<ComplexMember>>(
    ['members', page, searchedKeyword],
    () => memberApi.list(memberParams.toString()),
  );
  const members = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 0;

  useEffect(() => { setKeyword(searchedKeyword); }, [searchedKeyword]);

  const columns: Column<ComplexMember>[] = [
    {
      header: '이름', render: (m) => (
        <span style={{ fontWeight: 'bold', color: '#4a90e2' }}>{m.name}</span>
      ),
    },
    { header: '연락처', render: (m) => <span style={{ fontFamily: 'monospace', fontSize: '70%' }}>{m.phoneNumber}</span> },
    { header: '레벨', render: (m) => <span style={{ fontSize: '70%' }}>{m.level || ''}</span> },
    { header: '언어', render: (m) => <span style={{ fontSize: '70%' }}>{m.language || ''}</span> },
    { header: '인적사항', render: (m) => <span style={{ color: '#888', fontSize: '70%' }}>{m.info || ''}</span> },
    {
      header: '멤버쉽', render: (m) => (
        <button onClick={(e) => { e.stopPropagation(); openInfoModal(m.seq, m.name); }}
          style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}>
          🔍
        </button>
      ),
    },
    {
      header: '입금액', render: (m) => m.firstPaymentAmount != null
        ? <span style={{ fontWeight: 600, fontSize: '70%' }}>{m.firstPaymentAmount.toLocaleString()}원</span>
        : <span style={{ color: '#ccc', fontSize: '0.78rem' }}>—</span>,
    },
    {
      header: '입금날짜', render: (m) => <span style={{ fontSize: '0.75rem', color: '#666' }}>
        {m.firstPaymentDate?.split('T')[0] ?? '—'}
      </span>,
    },
    historyColumn,
    { header: '가입경로', render: (m) => <span style={{ color: '#555', fontSize: '70%' }}>{m.signupChannel || ''}</span> },
    { header: '인터뷰어', render: (m) => <span style={{ color: '#555', fontSize: '70%' }}>{m.interviewer || ''}</span> },
    { header: '등록일자', render: (m) => <span style={{ fontSize: '0.75rem', color: '#666' }}>{m.createdDate?.split('T')[0] ?? ''}</span> },
    { header: '특이사항', render: (m) => <span style={{ color: '#888', fontSize: '70%' }}>{m.comment || ''}</span> },
    recentHistoryColumn,
  ];

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>회원 관리</h2>
        <Button onClick={() => router.push(ROUTES.COMPLEX_MEMBERS_ADD)}>+ 새 회원 등록</Button>
      </div>
      <SearchBar
        keyword={keyword}
        onKeywordChange={setKeyword}
        onSearch={() => setParams({ page: '0', keyword })}
        onReset={keyword ? () => { setKeyword(''); setParams({ page: '0', keyword: '' }); } : undefined}
        placeholder="이름/전화번호 검색"
      />

      <DataTable
        columns={columns}
        data={members}
        rowKey={(m) => m.seq}
        pagination={{ page, totalPages, onPageChange: (p) => setParams({ page: String(p) }) }}
        onRowClick={(m) => router.push(ROUTES.COMPLEX_MEMBER_EDIT(m.seq))}
      />

      {infoModal}

      {historyModal}
    </>
  );
}
