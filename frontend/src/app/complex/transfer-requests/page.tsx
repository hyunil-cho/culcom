'use client';

import { Suspense, useEffect, useState } from 'react';
import { transferApi, type TransferRequestItem, type TransferStatus } from '@/lib/api';
import type { PageResponse } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { invalidateAll, MEMBERSHIP_RELATED } from '@/lib/invalidate';
import { useQueryParams } from '@/lib/useQueryParams';
import SearchBar from '@/components/ui/SearchBar';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { useModal } from '@/hooks/useModal';
import TransferDetailModal from './TransferDetailModal';

const STATUS_STYLE: Record<TransferStatus, { color: string; bg: string }> = {
  '생성': { color: '#1e40af', bg: '#eff6ff' },
  '접수': { color: '#b45309', bg: '#fef3c7' },
  '확인': { color: '#16a34a', bg: '#dcfce7' },
  '거절': { color: '#dc2626', bg: '#fee2e2' },
};

const DEFAULT_STATUS_FILTER: TransferStatus | 'ALL' = 'ALL';

const STATUS_OPTIONS: { value: TransferStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: '생성', label: '생성' },
  { value: '접수', label: '접수 대기' },
  { value: '확인', label: '승인' },
  { value: '거절', label: '거절' },
];

const DEFAULTS = { keyword: '', status: DEFAULT_STATUS_FILTER as string, page: '0' };

export default function TransferRequestsPage() {
  return <Suspense><TransferRequestsContent /></Suspense>;
}

function TransferRequestsContent() {
  const { params, setParams } = useQueryParams(DEFAULTS);
  const searchedKeyword = params.keyword;
  const statusFilter = (params.status as TransferStatus | 'ALL') ?? DEFAULT_STATUS_FILTER;
  const page = Number(params.page) || 0;

  const { data: pageData } = useApiQuery<PageResponse<TransferRequestItem>>(
    ['transferRequests', statusFilter, page],
    () => transferApi.list({
      status: statusFilter === 'ALL' ? undefined : (statusFilter as TransferStatus),
      includeReferenced: true,
      page,
      size: 20,
    }),
  );
  const items = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 0;
  const [keyword, setKeyword] = useState(searchedKeyword);
  const detailModal = useModal<TransferRequestItem>();

  useEffect(() => { setKeyword(searchedKeyword); }, [searchedKeyword]);

  const filtered = searchedKeyword
    ? items.filter(item =>
        item.fromMemberName.includes(searchedKeyword) ||
        item.membershipName.includes(searchedKeyword) ||
        item.fromMemberPhone.includes(searchedKeyword) ||
        (item.toCustomerName ?? '').includes(searchedKeyword))
    : items;

  const columns: Column<TransferRequestItem>[] = [
    { header: '번호', render: (_, i) => (i ?? 0) + 1, style: { width: 50, color: '#adb5bd', textAlign: 'center' } },
    { header: '상태', render: (item) => {
      const s = STATUS_STYLE[item.status] ?? { color: '#6b7280', bg: '#f3f4f6' };
      return (
        <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '2px 10px', borderRadius: 10, color: s.color, background: s.bg }}>
          {item.status}
        </span>
      );
    }},
    { header: '멤버십', render: (item) => <strong>{item.membershipName}</strong> },
    { header: '양도자', render: (item) => (
      <span>
        <span style={{ fontWeight: 600, color: '#4a90e2' }}>{item.fromMemberName}</span>
        <span style={{ fontSize: '0.78rem', color: '#6b7280', marginLeft: 6, fontFamily: 'monospace' }}>{item.fromMemberPhone}</span>
      </span>
    )},
    { header: '양수자', render: (item) => item.toCustomerName
      ? <span style={{ fontWeight: 600, color: '#10b981' }}>{item.toCustomerName}</span>
      : <span style={{ color: '#ccc', fontSize: '0.78rem' }}>—</span>
    },
    { header: '잔여', render: (item) => `${item.remainingCount}회` },
    { header: '양도비', render: (item) => `${item.transferFee.toLocaleString()}원` },
    { header: '요청일', render: (item) => <span style={{ fontSize: '0.75rem', color: '#666' }}>{item.createdDate?.split('T')[0] ?? '-'}</span> },
  ];

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>양도 요청 관리</h2>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {STATUS_OPTIONS.map(opt => {
          const active = statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setParams({ status: opt.value, keyword, page: '0' })}
              aria-pressed={active}
              style={{
                padding: '6px 14px', borderRadius: 16,
                border: `1.5px solid ${active ? '#4a90e2' : '#d1d5db'}`,
                background: active ? '#4a90e2' : '#fff',
                color: active ? '#fff' : '#475569',
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <SearchBar
        keyword={keyword}
        onKeywordChange={setKeyword}
        onSearch={() => setParams({ keyword, status: statusFilter, page: '0' })}
        onReset={keyword ? () => { setKeyword(''); setParams({ keyword: '', status: statusFilter, page: '0' }); } : undefined}
        placeholder="양도자/양수자/멤버십 검색"
      />

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(item) => item.seq}
        emptyMessage="양도 요청이 없습니다."
        onRowClick={(item) => detailModal.open(item)}
        pagination={{
          page,
          totalPages,
          onPageChange: (p) => setParams({ page: String(p) }),
        }}
      />

      {detailModal.isOpen && (
        <TransferDetailModal
          item={detailModal.data!}
          onClose={detailModal.close}
          onStatusChange={() => invalidateAll(['transferRequests', ...MEMBERSHIP_RELATED])}
        />
      )}
    </>
  );
}
