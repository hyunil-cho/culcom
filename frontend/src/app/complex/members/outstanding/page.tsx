'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { outstandingApi, type OutstandingItem, type PageResponse } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import DataTable, { type Column } from '@/components/ui/DataTable';
import SearchBar from '@/components/ui/SearchBar';
import PaymentAddModal from './PaymentAddModal';

type SortKey = 'OUTSTANDING_DESC' | 'DAYS_DESC' | 'NAME';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'OUTSTANDING_DESC', label: '미수금 큰 순' },
  { value: 'DAYS_DESC', label: '경과일수 오래된 순' },
  { value: 'NAME', label: '회원명' },
];

export default function OutstandingPage() {
  return <Suspense><OutstandingContent /></Suspense>;
}

function OutstandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialKeyword = searchParams.get('keyword') ?? '';

  const [keyword, setKeyword] = useState(initialKeyword);
  const [searched, setSearched] = useState(initialKeyword);
  const [sort, setSort] = useState<SortKey>('OUTSTANDING_DESC');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResponse<OutstandingItem> | null>(null);
  const [loading, setLoading] = useState(false);

  const [paymentModal, setPaymentModal] = useState<OutstandingItem | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    outstandingApi.list({ keyword: searched, sort, page, size: 20 })
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, [searched, sort, page]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = () => { setPage(0); setSearched(keyword); };
  const handleReset = () => { setKeyword(''); setSearched(''); setPage(0); };

  const totalOutstanding = data?.content.reduce((acc, it) => acc + it.outstanding, 0) ?? 0;

  const columns: Column<OutstandingItem>[] = [
    { header: '회원', render: (it) => <strong style={{ color: '#4a90e2' }}>{it.memberName}</strong> },
    { header: '연락처', render: (it) => <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{it.phoneNumber}</span> },
    { header: '멤버십', render: (it) => it.membershipName },
    { header: '총액', render: (it) => it.price?.toLocaleString() ?? '-', style: { textAlign: 'right' } },
    { header: '납부합계', render: (it) => <span style={{ color: '#2e7d32' }}>{it.paidAmount.toLocaleString()}</span>, style: { textAlign: 'right' } },
    {
      header: '미수금',
      render: (it) => (
        <strong style={{ color: '#e03131' }}>{it.outstanding.toLocaleString()}원</strong>
      ),
      style: { textAlign: 'right' },
    },
    {
      header: '마지막 납부일',
      render: (it) => it.lastPaidDate
        ? <span style={{ fontSize: 12, color: '#666' }}>{it.lastPaidDate.split('T')[0]}</span>
        : <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      header: '경과',
      render: (it) => it.daysSinceLastPaid != null
        ? <span style={{ fontSize: 12, color: it.daysSinceLastPaid > 30 ? '#e03131' : '#888' }}>{it.daysSinceLastPaid}일</span>
        : <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      header: '상태',
      render: (it) => (
        <span className="badge badge-success" style={{
          background: it.paymentStatus === '미납' ? '#fff5f5' : '#fffbeb',
          color: it.paymentStatus === '미납' ? '#e03131' : '#d97706',
          border: `1px solid ${it.paymentStatus === '미납' ? '#ffc9c9' : '#fde68a'}`,
        }}>
          {it.paymentStatus}
        </span>
      ),
    },
    {
      header: '액션',
      render: (it) => (
        <div onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setPaymentModal(it)} style={btnStyle('#4a90e2')}>+ 납부</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>미수금 관리</h2>
        {data && (
          <div style={{ fontSize: 13, color: '#666' }}>
            전체 {data.totalElements}건 · 이 페이지 합계{' '}
            <strong style={{ color: '#e03131' }}>{totalOutstanding.toLocaleString()}원</strong>
          </div>
        )}
      </div>

      <SearchBar
        keyword={keyword}
        onKeywordChange={setKeyword}
        onSearch={handleSearch}
        onReset={searched ? handleReset : undefined}
        placeholder="회원명/연락처 검색"
      />

      {/* 테이블 상단 우측 정렬 토글 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: '#f1f3f5', borderRadius: 8, alignItems: 'center' }}>
          <span style={{ padding: '0 8px 0 12px', fontSize: 12, color: '#888' }}>정렬</span>
          {SORT_OPTIONS.map(opt => {
            const active = sort === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => { setSort(opt.value); setPage(0); }}
                style={{
                  padding: '8px 14px', borderRadius: 6, border: 'none',
                  background: active ? '#fff' : 'transparent',
                  color: active ? '#4a90e2' : '#666',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer', fontSize: 13,
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.content ?? []}
        rowKey={(it) => it.memberMembershipSeq}
        emptyMessage={loading ? '불러오는 중…' : '미수금이 있는 회원이 없습니다.'}
        pagination={{ page, totalPages: data?.totalPages ?? 0, onPageChange: setPage }}
        onRowClick={(it) => router.push(`${ROUTES.COMPLEX_MEMBER_EDIT(it.memberSeq)}?tab=payment`)}
      />

      {paymentModal && (
        <PaymentAddModal
          memberSeq={paymentModal.memberSeq}
          memberName={paymentModal.memberName}
          mmSeq={paymentModal.memberMembershipSeq}
          membershipName={paymentModal.membershipName}
          outstanding={paymentModal.outstanding}
          onClose={() => setPaymentModal(null)}
          onSaved={() => { setPaymentModal(null); load(); }}
        />
      )}

    </>
  );
}

function btnStyle(color: string): React.CSSProperties {
  return {
    background: 'transparent',
    border: `1px solid ${color}`,
    color,
    borderRadius: 4,
    padding: '4px 10px',
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  };
}
