'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { customerApi, type Customer, type PageResponse } from '@/lib/api';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filter, setFilter] = useState('all');
  const [keyword, setKeyword] = useState('');

  const load = async () => {
    const params = new URLSearchParams({ page: String(page), size: '20', filter });
    if (keyword) {
      params.set('keyword', keyword);
      params.set('searchType', 'name');
    }
    const res = await customerApi.list(params.toString());
    const data = res.data as PageResponse<Customer>;
    setCustomers(data.content);
    setTotalPages(data.totalPages);
  };

  useEffect(() => { load(); }, [page, filter]);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      '신규': 'badge-info', '예약확정': 'badge-success',
      '진행중': 'badge-warning', '전화상거절': 'badge-danger', '콜수초과': 'badge-danger',
    };
    return <span className={`badge ${map[status] ?? ''}`}>{status}</span>;
  };

  return (
    <AppLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>고객 관리</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }}
                  style={{ width: 'auto' }}>
            <option value="all">전체</option>
            <option value="new">신규/진행중</option>
          </select>
          <input
            placeholder="이름 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            style={{ width: 200 }}
          />
          <button className="btn-primary" onClick={load}>검색</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>전화번호</th>
              <th>상태</th>
              <th>콜수</th>
              <th>등록일</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.seq}>
                <td>{c.name}</td>
                <td>{c.phoneNumber}</td>
                <td>{statusBadge(c.status)}</td>
                <td>{c.callCount}</td>
                <td>{c.createdDate?.split('T')[0]}</td>
                <td>{c.comment ?? ''}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
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
