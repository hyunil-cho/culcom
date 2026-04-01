'use client';

import { useEffect, useState } from 'react';
import { memberApi, type ComplexMember, type PageResponse } from '@/lib/api';
import SearchBar from '@/components/ui/SearchBar';
import DataTable, { type Column } from '@/components/ui/DataTable';

const columns: Column<ComplexMember>[] = [
  { header: '이름', render: (m) => m.name },
  { header: '전화번호', render: (m) => m.phoneNumber },
  { header: '레벨', render: (m) => m.level ?? '-' },
  { header: '언어', render: (m) => m.language ?? '-' },
  { header: '차트번호', render: (m) => m.chartNumber ?? '-' },
];

export default function MembersPage() {
  const [members, setMembers] = useState<ComplexMember[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [keyword, setKeyword] = useState('');

  const load = async () => {
    const params = new URLSearchParams({ page: String(page), size: '20' });
    if (keyword) params.set('keyword', keyword);
    const res = await memberApi.list(params.toString());
    const data = res.data as PageResponse<ComplexMember>;
    setMembers(data.content);
    setTotalPages(data.totalPages);
  };

  useEffect(() => { load(); }, [page]);

  return (
    <>
      <h2 className="page-title">회원 관리</h2>
      <SearchBar
        keyword={keyword}
        onKeywordChange={setKeyword}
        onSearch={load}
        placeholder="이름/전화번호 검색"
      />

      <DataTable
        columns={columns}
        data={members}
        rowKey={(m) => m.seq}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </>
  );
}
