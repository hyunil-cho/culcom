'use client';

import { useState } from 'react';
import { staffApi, classApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import StaffForm, {
  emptyStaffForm, emptyClassAssign, validateStaffForm,
  type StaffFormData, type ClassAssignData,
} from '../StaffForm';
import { useResultModal } from '@/hooks/useResultModal';

export default function StaffAddPage() {
  const [form, setForm] = useState<StaffFormData>(emptyStaffForm);
  const [classAssign, setClassAssign] = useState<ClassAssignData>(emptyClassAssign);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.COMPLEX_STAFFS });

  const handleSubmit = async () => {
    const error = validateStaffForm(form);
    if (error) { alert(error); return; }
    const res = await staffApi.create({
      name: form.name,
      phoneNumber: form.phoneNumber || undefined,
      email: form.email || undefined,
      subject: form.subject || undefined,
      status: form.status,
      interviewer: form.interviewer || undefined,
      paymentMethod: form.paymentMethod || undefined,
      comment: form.comment || undefined,
    });
    if (res.success && res.data) {
      const staffSeq = res.data.seq;

      // 환급 정보 저장
      const r = form.refund;
      const hasRefund = r.depositAmount || r.refundableDeposit || r.nonRefundableDeposit
        || r.refundBank || r.refundAccount || r.refundAmount;
      if (hasRefund) {
        await staffApi.saveRefund(staffSeq, {
          depositAmount: r.depositAmount || undefined,
          refundableDeposit: r.refundableDeposit || undefined,
          nonRefundableDeposit: r.nonRefundableDeposit || undefined,
          refundBank: r.refundBank || undefined,
          refundAccount: r.refundAccount || undefined,
          refundAmount: r.refundAmount || undefined,
        });
      }

      // 수업 배정 (선택)
      if (classAssign.classSeq) {
        const classRes = await classApi.get(Number(classAssign.classSeq));
        if (classRes.success && classRes.data) {
          const c = classRes.data;
          await classApi.update(c.seq, {
            name: c.name,
            description: c.description,
            capacity: c.capacity,
            sortOrder: c.sortOrder,
            timeSlotSeq: c.timeSlotSeq,
            staffSeq: staffSeq,
          });
        }
      }
    }
    await run(Promise.resolve(res), '스태프가 등록되었습니다.');
  };

  return (
    <>
      <StaffForm form={form} onChange={setForm} onSubmit={handleSubmit}
        backHref={ROUTES.COMPLEX_STAFFS} submitLabel="등록"
        classAssign={classAssign} onClassAssignChange={setClassAssign} />
      {modal}
    </>
  );
}
