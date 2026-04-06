'use client';

import { useParams } from 'next/navigation';
import { ROUTES } from '@/lib/routes';
import StaffForm from '../../StaffForm';
import { useStaffForm } from '../../useStaffForm';

export default function StaffEditPage() {
  const seq = Number(useParams().seq);
  const { form, setForm, classAssign, setClassAssign, handleSubmit, modal } = useStaffForm(seq);

  return (
    <>
      <StaffForm form={form} onChange={setForm} onSubmit={handleSubmit}
        isEdit backHref={ROUTES.COMPLEX_STAFFS} submitLabel="수정"
        classAssign={classAssign} onClassAssignChange={setClassAssign}
        currentStaffSeq={seq} />
      {/* 삭제 기능 비활성화
      {deleting && (
        <ConfirmModal title="삭제 확인" onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            setDeleting(false);
            await run(staffApi.delete(seq), '스태프가 삭제되었습니다.');
          }} confirmLabel="삭제" confirmColor="#f44336">
          이 스태프를 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.
        </ConfirmModal>
      )}
      */}
      {modal}
    </>
  );
}
