'use client';

import { Suspense, useEffect, useState } from 'react';
import { transferApi, type TransferRequestItem, type TransferStatus } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { queryClient } from '@/lib/queryClient';
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

/**
 * 기본은 '전체' — 참조 완료(양도 확정된) 건은 서버에서 자동으로 숨겨지므로,
 * 실제로는 진행 중/거절 건만 노출된다. "참조 완료 포함" 토글로 전체 이력을 볼 수 있다.
 */
const DEFAULT_STATUS_FILTER: TransferStatus | 'ALL' = 'ALL';

const STATUS_OPTIONS: { value: TransferStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: '생성', label: '생성' },
  { value: '접수', label: '접수 대기' },
  { value: '확인', label: '승인' },
  { value: '거절', label: '거절' },
];

const DEFAULTS = { keyword: '', status: DEFAULT_STATUS_FILTER as string, includeReferenced: 'false' };

export default function TransferRequestsPage() {
  return <Suspense><TransferRequestsContent /></Suspense>;
}

function TransferRequestsContent() {
  const { params, setParams } = useQueryParams(DEFAULTS);
  const searchedKeyword = params.keyword;
  const statusFilter = (params.status as TransferStatus | 'ALL') ?? DEFAULT_STATUS_FILTER;
  const includeReferenced = params.includeReferenced === 'true';

  const { data: items = [] } = useApiQuery<TransferRequestItem[]>(
    ['transferRequests', statusFilter, includeReferenced],
    () => transferApi.list({
      status: statusFilter === 'ALL' ? undefined : (statusFilter as TransferStatus),
      includeReferenced,
    }),
  );
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
    { header: '상세', render: (item) => (
      <button
        onClick={(e) => { e.stopPropagation(); detailModal.open(item); }}
        style={{
          background: '#6366f1', color: '#fff', border: 'none', borderRadius: 3,
          padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600,
        }}
      >
        상세
      </button>
    )},
  ];

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>양도 요청 관리</h2>
      </div>

      {/* 상태 필터 + 참조 완료 포함 토글 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {STATUS_OPTIONS.map(opt => {
          const active = statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setParams({ status: opt.value, keyword, includeReferenced: String(includeReferenced) })}
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
        <label style={{
          display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto',
          fontSize: '0.82rem', color: '#475569', cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={includeReferenced}
            onChange={(e) => setParams({
              keyword, status: statusFilter, includeReferenced: String(e.target.checked),
            })}
          />
          참조 완료 포함 (완료된 양도 이력까지 표시)
        </label>
      </div>

      <SearchBar
        keyword={keyword}
        onKeywordChange={setKeyword}
        onSearch={() => setParams({ keyword, status: statusFilter, includeReferenced: String(includeReferenced) })}
        onReset={keyword ? () => { setKeyword(''); setParams({ keyword: '', status: statusFilter, includeReferenced: String(includeReferenced) }); } : undefined}
        placeholder="양도자/양수자/멤버십 검색"
      />

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(item) => item.seq}
        emptyMessage="양도 요청이 없습니다."
        onRowClick={(item) => detailModal.open(item)}
      />

      {detailModal.isOpen && (
        <TransferDetailModal
          item={detailModal.data!}
          onClose={detailModal.close}
          onStatusChange={() => queryClient.invalidateQueries({ queryKey: ['transferRequests'] })}
        />
      )}
    </>
  );
}
