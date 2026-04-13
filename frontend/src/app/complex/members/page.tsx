'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { memberApi, outstandingApi, type ComplexMember } from '@/lib/api';
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

  // 미수금 합계 매핑 로드 (전체 한 번에 가져와서 회원별 합산)
  const { data: outstandingData } = useApiQuery<PageResponse<{ memberSeq: number; outstanding: number }>>(
    ['outstandingMap'],
    () => outstandingApi.list({ size: 1000 }),
  );
  const outstandingMap = (() => {
    const map = new Map<number, number>();
    if (outstandingData) {
      for (const item of outstandingData.content) {
        map.set(item.memberSeq, (map.get(item.memberSeq) ?? 0) + item.outstanding);
      }
    }
    return map;
  })();

  useEffect(() => { setKeyword(searchedKeyword); }, [searchedKeyword]);

  const columns: Column<ComplexMember>[] = [
    { header: '번호', render: (_, i) => page * 20 + (i ?? 0) + 1, style: { width: 50, color: '#adb5bd', textAlign: 'center' } },
    {
      header: '이름', render: (m) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 'bold', color: '#4a90e2' }}>{m.name}</span>
          {m.staffStatus && (
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, color: '#fff',
              background: '#6366f1', borderRadius: 3, padding: '1px 6px',
            }}>STAFF</span>
          )}
        </span>
      ),
    },
    { header: '전화번호', render: (m) => <span style={{ fontFamily: 'monospace' }}>{m.phoneNumber}</span> },
    { header: '레벨', render: (m) => m.level || '' },
    { header: '언어', render: (m) => m.language || '' },
    { header: '인적사항', render: (m) => <span style={{ color: '#888' }}>{m.info || ''}</span> },
    {
      header: '멤버십', render: (m) => (
        <button onClick={(e) => { e.stopPropagation(); openInfoModal(m.seq, m.name); }}
          style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}>
          정보
        </button>
      ),
    },
    {
      header: '미수금', render: (m) => {
        const out = outstandingMap.get(m.seq);
        if (!out || out <= 0) return <span style={{ color: '#ccc', fontSize: '0.78rem' }}>—</span>;
        return (
          <button
            onClick={(e) => { e.stopPropagation(); router.push(`${ROUTES.COMPLEX_OUTSTANDING}?keyword=${encodeURIComponent(m.name)}`); }}
            title="미수금 관리로 이동"
            style={{
              background: '#fff5f5', color: '#e03131', border: '1px solid #ffc9c9',
              borderRadius: 3, padding: '4px 8px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700,
            }}
          >
            {out.toLocaleString()}원
          </button>
        );
      },
    },
    historyColumn,
    { header: '가입경로', render: (m) => <span style={{ color: '#555' }}>{m.signupChannel || ''}</span> },
    { header: '등록일자', render: (m) => <span style={{ fontSize: '0.75rem', color: '#666' }}>{m.createdDate?.split('T')[0] ?? ''}</span> },
    { header: '수정일자', render: (m) => <span style={{ fontSize: '0.75rem', color: '#666' }}>{m.lastUpdateDate?.split('T')[0] ?? ''}</span> },
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
