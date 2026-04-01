'use client';

import { useEffect, useState } from 'react';
import { memberApi, type ComplexMember, type PageResponse } from '@/lib/api';

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
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>회원 관리</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="이름/전화번호 검색" value={keyword}
                 onChange={(e) => setKeyword(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && load()}
                 style={{ width: 200 }} />
          <button className="btn-primary" onClick={load}>검색</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>전화번호</th>
              <th>레벨</th>
              <th>언어</th>
              <th>차트번호</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.seq}>
                <td>{m.name}</td>
                <td>{m.phoneNumber}</td>
                <td>{m.level ?? '-'}</td>
                <td>{m.language ?? '-'}</td>
                <td>{m.chartNumber ?? '-'}</td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr><td colSpan={5} className="table-empty">데이터가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn-secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>이전</button>
          <span className="pagination-info">{page + 1} / {totalPages}</span>
          <button className="btn-secondary" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>다음</button>
        </div>
      )}
    </>
  );
}
