'use client';

import { useRouter } from 'next/navigation';
import { timeslotApi, type ClassTimeSlot } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { queryClient } from '@/lib/queryClient';
import { ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { useModal } from '@/hooks/useModal';
import { useResultModal } from '@/hooks/useResultModal';

export default function TimeslotsPage() {
  const router = useRouter();
  const { data: slots = [] } = useApiQuery<ClassTimeSlot[]>(['timeslots'], () => timeslotApi.list());
  const { run, modal } = useResultModal({ onConfirm: () => queryClient.invalidateQueries({ queryKey: ['timeslots'] }) });
  const deleteModal = useModal<ClassTimeSlot>();

  const handleDelete = async () => {
    if (!deleteModal.data) return;
    const target = deleteModal.data;
    deleteModal.close();
    await run(timeslotApi.delete(target.seq), '시간대가 삭제되었습니다.');
  };

  const columns: Column<ClassTimeSlot>[] = [
    { header: '시간대 이름', render: (s) => s.name },
    { header: '요일', render: (s) => <span className="badge badge-success">{s.daysOfWeek.replace(/,/g, ', ')}요일</span> },
    { header: '시작 시간', render: (s) => s.startTime },
    { header: '종료 시간', render: (s) => s.endTime },
    {
      header: '삭제',
      render: (s) => (
        <button
          className="btn-inline"
          style={{ background: '#ffebee', borderColor: '#f44336', color: '#d32f2f' }}
          onClick={(e) => { e.stopPropagation(); deleteModal.open(s); }}
        >
          삭제
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>시간대 설정</h2>
        <Button onClick={() => router.push(ROUTES.COMPLEX_TIMESLOTS_ADD)}>+ 시간대 추가</Button>
      </div>

      <DataTable
        columns={columns}
        data={slots}
        rowKey={(s) => s.seq}
        headerInfo={<span>총 <strong>{slots.length}</strong>개 시간대</span>}
        emptyMessage="등록된 수업 시간대가 없습니다."
        emptyAction={<Button onClick={() => router.push(ROUTES.COMPLEX_TIMESLOTS_ADD)}>+ 시간대 추가</Button>}
        onRowClick={(s) => router.push(ROUTES.COMPLEX_TIMESLOT_EDIT(s.seq))}
      />

      {deleteModal.isOpen && (
        <ConfirmModal
          title="시간대 삭제"
          onCancel={deleteModal.close}
          onConfirm={handleDelete}
          confirmLabel="삭제"
          confirmColor="#f44336"
        >
          <p><strong>{deleteModal.data!.name}</strong> 시간대를 삭제하시겠습니까?</p>
          <p style={{ color: '#dc2626', fontWeight: 600, marginTop: 8 }}>
            ⚠️ 사용 중인 팀이 있는 시간대는 삭제할 수 없습니다.
          </p>
        </ConfirmModal>
      )}

      {modal}
    </>
  );
}
