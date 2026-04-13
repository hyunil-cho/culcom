'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { consentItemApi, type ConsentItem } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useQueryParams } from '@/lib/useQueryParams';
import { Button } from '@/components/ui/Button';
import SearchBar from '@/components/ui/SearchBar';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { CATEGORIES } from './ConsentItemForm';
import { useModal } from '@/hooks/useModal';
import ConsentPreviewModal from './ConsentPreviewModal';

const categoryMap = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));
const DEFAULTS = { keyword: '' };

export default function ConsentItemsPage() {
  return <Suspense><ConsentItemsContent /></Suspense>;
}

function ConsentItemsContent() {
  const router = useRouter();
  const { params, setParams } = useQueryParams(DEFAULTS);
  const searchedKeyword = params.keyword;

  const [items, setItems] = useState<ConsentItem[]>([]);
  const [keyword, setKeyword] = useState(searchedKeyword);
  const previewModal = useModal<ConsentItem>();

  const load = useCallback(async () => {
    const res = await consentItemApi.list();
    if (res.success) setItems(res.data);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setKeyword(searchedKeyword); }, [searchedKeyword]);

  const filtered = searchedKeyword
    ? items.filter(item =>
        item.title.includes(searchedKeyword) ||
        (categoryMap[item.category] ?? item.category).includes(searchedKeyword))
    : items;

  const columns: Column<ConsentItem>[] = [
    { header: '번호', render: (_, i) => (i ?? 0) + 1, style: { width: 50, color: '#adb5bd', textAlign: 'center' } },
    { header: '제목', render: (item) => <strong>{item.title}</strong> },
    { header: '카테고리', render: (item) => (
      <span style={{
        fontSize: '0.78rem', fontWeight: 600, padding: '2px 10px', borderRadius: 10,
        background: '#eff6ff', color: '#1e40af',
      }}>
        {categoryMap[item.category] ?? item.category}
      </span>
    )},
    { header: '필수', render: (item) => (
      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: item.required ? '#dc2626' : '#6b7280' }}>
        {item.required ? '필수' : '선택'}
      </span>
    )},
    { header: '버전', render: (item) => <span style={{ fontFamily: 'monospace', color: '#6b7280' }}>v{item.version}</span> },
    { header: '미리보기', render: (item) => (
      <button
        onClick={(e) => { e.stopPropagation(); previewModal.open(item); }}
        style={{
          background: '#6366f1', color: '#fff', border: 'none', borderRadius: 3,
          padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600,
        }}
      >
        미리보기
      </button>
    )},
    { header: '등록일', render: (item) => <span style={{ fontSize: '0.75rem', color: '#666' }}>{item.createdDate?.split('T')[0] ?? '-'}</span> },
  ];

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>동의항목 관리</h2>
        <Button onClick={() => router.push(ROUTES.CONSENT_ITEMS_ADD)}>+ 새 동의항목 등록</Button>
      </div>

      <SearchBar
        keyword={keyword}
        onKeywordChange={setKeyword}
        onSearch={() => setParams({ keyword })}
        onReset={keyword ? () => { setKeyword(''); setParams({ keyword: '' }); } : undefined}
        placeholder="제목/카테고리 검색"
      />

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(item) => item.seq}
        emptyMessage="등록된 동의항목이 없습니다."
        onRowClick={(item) => router.push(ROUTES.CONSENT_ITEM_EDIT(item.seq))}
      />

      {previewModal.isOpen && (
        <ConsentPreviewModal
          title={previewModal.data!.title}
          content={previewModal.data!.content}
          required={previewModal.data!.required}
          onClose={previewModal.close}
        />
      )}
    </>
  );
}
