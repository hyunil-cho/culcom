'use client';

import { useRouter } from 'next/navigation';
import { membershipApi, type Membership } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { queryClient } from '@/lib/queryClient';
import { ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { useModal } from '@/hooks/useModal';
import { useResultModal } from '@/hooks/useResultModal';

function formatDuration(days: number): string {
  if (days > 0 && days % 365 === 0) return `${days / 365}년`;
  if (days > 0 && days % 30 === 0) return `${days / 30}개월`;
  return `${days}일`;
}

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원';
}

export default function MembershipsPage() {
  const router = useRouter();
  const { data: memberships = [] } = useApiQuery<Membership[]>(['memberships'], () => membershipApi.list());
  const { run, modal } = useResultModal({ onConfirm: () => queryClient.invalidateQueries({ queryKey: ['memberships'] }) });
  const deleteModal = useModal<Membership>();

  const handleDelete = async () => {
    if (!deleteModal.data) return;
    const target = deleteModal.data;
    deleteModal.close();
    await run(membershipApi.delete(target.seq), '멤버십이 삭제되었습니다.');
  };

  const columns: Column<Membership>[] = [
    { header: '멤버십 이름', render: (m) => m.name },
    { header: '사용 기간', render: (m) => formatDuration(m.duration) },
    { header: '수강 횟수', render: (m) => `${m.count}회` },
    { header: '판매 가격', render: (m) => formatPrice(m.price) },
    { header: '양도', render: (m) => (
      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: m.transferable ? '#16a34a' : '#dc2626' }}>
        {m.transferable ? '가능' : '불가'}
      </span>
    )},
    { header: '등록일', render: (m) => m.createdDate?.split('T')[0] ?? '-' },
    { header: '삭제', render: (m) => (
      <button
        className="btn-inline"
        style={{ background: '#ffebee', borderColor: '#f44336', color: '#d32f2f' }}
        onClick={(e) => { e.stopPropagation(); deleteModal.open(m); }}
      >
        삭제
      </button>
    )},
  ];

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>멤버십 관리</h2>
        <Button onClick={() => router.push(ROUTES.COMPLEX_MEMBERSHIPS_ADD)}>+ 신규 멤버십 등록</Button>
      </div>

      <DataTable
        columns={columns}
        data={memberships}
        rowKey={(m) => m.seq}
        emptyMessage="등록된 멤버십 정보가 없습니다."
        emptyAction={<Button onClick={() => router.push(ROUTES.COMPLEX_MEMBERSHIPS_ADD)}>+ 신규 멤버십 등록</Button>}
        onRowClick={(m) => router.push(ROUTES.COMPLEX_MEMBERSHIP_EDIT(m.seq))}
      />

      {deleteModal.isOpen && (
        <ConfirmModal
          title="멤버십 삭제"
          onCancel={deleteModal.close}
          onConfirm={handleDelete}
          confirmLabel="삭제"
          confirmColor="#f44336"
        >
          <p><strong>{deleteModal.data!.name}</strong> 멤버십을 삭제하시겠습니까?</p>
          <p style={{ color: '#dc2626', fontWeight: 600, marginTop: 8 }}>⚠️ 이 작업은 되돌릴 수 없습니다.</p>
        </ConfirmModal>
      )}

      {modal}
    </>
  );
}
