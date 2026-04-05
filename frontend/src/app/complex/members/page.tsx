'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { memberApi, type ComplexMember, type PageResponse } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useQueryParams } from '@/lib/useQueryParams';
import { Button } from '@/components/ui/Button';
import SearchBar from '@/components/ui/SearchBar';
import DataTable, { type Column } from '@/components/ui/DataTable';
import MembershipInfoModal from './components/MembershipInfoModal';
import AttendanceHistoryModal from '@/components/ui/AttendanceHistoryModal';

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
  const [historyModal, setHistoryModal] = useState<{ seq: number; name: string } | null>(null);

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

  const columns: Column<ComplexMember>[] = [
    { header: '번호', render: (_, i) => page * 20 + (i ?? 0) + 1, style: { width: 50, color: '#adb5bd', textAlign: 'center' } },
    { header: '이름', render: (m) => <span style={{ fontWeight: 'bold', color: '#4a90e2' }}>{m.name}</span> },
    { header: '전화번호', render: (m) => <span style={{ fontFamily: 'monospace' }}>{m.phoneNumber}</span> },
    { header: '레벨', render: (m) => m.level || '' },
    { header: '인적사항', render: (m) => <span style={{ color: '#888' }}>{m.info || ''}</span> },
    {
      header: '멤버십', render: (m) => (
        <button onClick={(e) => { e.stopPropagation(); setMembershipModal({ seq: m.seq, name: m.name }); }}
          style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}>
          멤버십 정보
        </button>
      ),
    },
    {
      header: '히스토리', render: (m) => (
        <button onClick={(e) => { e.stopPropagation(); setHistoryModal({ seq: m.seq, name: m.name }); }}
          style={{ background: '#4a90e2', color: '#fff', border: 'none', borderRadius: 3, padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}>
          히스토리
        </button>
      ),
    },
    { header: '가입경로', render: (m) => <span style={{ color: '#555' }}>{m.signupChannel || ''}</span> },
    { header: '인터뷰어', render: (m) => <span style={{ color: '#333', fontWeight: 600 }}>{m.interviewer || ''}</span> },
    { header: '등록일자', render: (m) => <span style={{ fontSize: '0.75rem', color: '#666' }}>{m.createdDate?.split('T')[0] ?? ''}</span> },
    { header: '수정일자', render: (m) => <span style={{ fontSize: '0.75rem', color: '#666' }}>{m.lastUpdateDate?.split('T')[0] ?? ''}</span> },
    {
      header: '관리', render: (m) => (
        <button onClick={(e) => { e.stopPropagation(); router.push(ROUTES.COMPLEX_MEMBER_EDIT(m.seq)); }}
          style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 3, padding: '3px 8px', fontSize: '0.75rem', cursor: 'pointer' }}>
          수정
        </button>
      ),
    },
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
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => setParams({ page: String(p) })}
        onRowClick={(m) => router.push(ROUTES.COMPLEX_MEMBER_EDIT(m.seq))}
      />

      {membershipModal && (
        <MembershipInfoModal
          memberSeq={membershipModal.seq}
          memberName={membershipModal.name}
          onClose={() => setMembershipModal(null)}
        />
      )}

      {historyModal && (
        <AttendanceHistoryModal
          seq={historyModal.seq}
          name={historyModal.name}
          type="member"
          onClose={() => setHistoryModal(null)}
        />
      )}
    </>
  );
}
