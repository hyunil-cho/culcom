'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
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
    <AppLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>회원 관리</h2>
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
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                데이터가 없습니다.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button className="btn-secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>이전</button>
          <span style={{ padding: '8px 16px', fontSize: 14 }}>{page + 1} / {totalPages}</span>
          <button className="btn-secondary" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>다음</button>
        </div>
      )}
    </AppLayout>
  );
}
