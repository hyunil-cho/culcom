'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { memberApi, outstandingApi, type ComplexMember, type PageResponse } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useQueryParams } from '@/lib/useQueryParams';
import { Button } from '@/components/ui/Button';
import SearchBar from '@/components/ui/SearchBar';
import DataTable, { type Column } from '@/components/ui/DataTable';
import MembershipInfoModal from './components/MembershipInfoModal';
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

  const [members, setMembers] = useState<ComplexMember[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [keyword, setKeyword] = useState(searchedKeyword);
  const [membershipModal, setMembershipModal] = useState<{ seq: number; name: string } | null>(null);
  const [outstandingMap, setOutstandingMap] = useState<Map<number, number>>(new Map());
  const { column: historyColumn, modal: historyModal } = useAttendanceHistory<ComplexMember>('member');
  const recentHistoryColumn = useAttendanceHistoryColumn<ComplexMember>();

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

  // 미수금 합계 매핑 로드 (전체 한 번에 가져와서 회원별 합산)
  useEffect(() => {
    outstandingApi.list({ size: 1000 }).then(res => {
      const map = new Map<number, number>();
      for (const item of res.data.content) {
        map.set(item.memberSeq, (map.get(item.memberSeq) ?? 0) + item.outstanding);
      }
      setOutstandingMap(map);
    });
  }, []);

  const columns: Column<ComplexMember>[] = [
    { header: '번호', render: (_, i) => page * 20 + (i ?? 0) + 1, style: { width: 50, color: '#adb5bd', textAlign: 'center' } },
    { header: '이름', render: (m) => <span style={{ fontWeight: 'bold', color: '#4a90e2' }}>{m.name}</span> },
    { header: '전화번호', render: (m) => <span style={{ fontFamily: 'monospace' }}>{m.phoneNumber}</span> },
    { header: '레벨', render: (m) => m.level || '' },
    { header: '언어', render: (m) => m.language || '' },
    { header: '인적사항', render: (m) => <span style={{ color: '#888' }}>{m.info || ''}</span> },
    {
      header: '멤버십', render: (m) => (
        <button onClick={(e) => { e.stopPropagation(); setMembershipModal({ seq: m.seq, name: m.name }); }}
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
    { header: '인터뷰어', render: (m) => <span style={{ color: '#333', fontWeight: 600 }}>{m.interviewer || ''}</span> },
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

      {membershipModal && (
        <MembershipInfoModal
          memberSeq={membershipModal.seq}
          memberName={membershipModal.name}
          onClose={() => setMembershipModal(null)}
        />
      )}

      {historyModal}
    </>
  );
}
