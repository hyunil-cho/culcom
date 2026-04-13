'use client';

import { useRouter } from 'next/navigation';
import { timeslotApi, type ClassTimeSlot } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import { queryClient } from '@/lib/queryClient';
import { ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { useResultModal } from '@/hooks/useResultModal';

export default function TimeslotsPage() {
  const router = useRouter();
  const { data: slots = [] } = useApiQuery<ClassTimeSlot[]>(['timeslots'], () => timeslotApi.list());
  const { modal } = useResultModal({ onConfirm: () => queryClient.invalidateQueries({ queryKey: ['timeslots'] }) });


  const columns: Column<ClassTimeSlot>[] = [
    { header: '시간대 이름', render: (s) => s.name },
    { header: '요일', render: (s) => <span className="badge badge-success">{s.daysOfWeek.replace(/,/g, ', ')}요일</span> },
    { header: '시작 시간', render: (s) => s.startTime },
    { header: '종료 시간', render: (s) => s.endTime },
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
        onRowClick={(s) => router.push(ROUTES.COMPLEX_TIMESLOT_EDIT(s.seq))}
      />

      {modal}
    </>
  );
}
