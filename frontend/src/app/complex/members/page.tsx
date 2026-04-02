'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { memberApi, type ComplexMember, type PageResponse } from '@/lib/api';
import { useQueryParams } from '@/lib/useQueryParams';
import SearchBar from '@/components/ui/SearchBar';
import DataTable, { type Column } from '@/components/ui/DataTable';

const columns: Column<ComplexMember>[] = [
  { header: '이름', render: (m) => m.name },
  { header: '전화번호', render: (m) => m.phoneNumber },
  { header: '레벨', render: (m) => m.level ?? '-' },
  { header: '언어', render: (m) => m.language ?? '-' },
  { header: '차트번호', render: (m) => m.chartNumber ?? '-' },
];

const DEFAULTS = { page: '0', keyword: '' };

export default function MembersPage() {
  return <Suspense><MembersContent /></Suspense>;
}

function MembersContent() {
  const { params, setParams } = useQueryParams(DEFAULTS);
  const page = Number(params.page);
  const searchedKeyword = params.keyword;

  const [members, setMembers] = useState<ComplexMember[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [keyword, setKeyword] = useState(searchedKeyword);

  const load = useCallback(async () => {
    const apiParams = new URLSearchParams({ page: String(page), size: '20' });
    if (searchedKeyword) apiParams.set('keyword', searchedKeyword);
    const res = await memberApi.list(apiParams.toString());
    const data = res.data as PageResponse<ComplexMember>;
    setMembers(data.content);
    setTotalPages(data.totalPages);
  }, [page, searchedKeyword]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { setKeyword(searchedKeyword); }, [searchedKeyword]);

  return (
    <>
      <h2 className="page-title">회원 관리</h2>
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
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => setParams({ page: String(p) })}
      />
    </>
  );
}
