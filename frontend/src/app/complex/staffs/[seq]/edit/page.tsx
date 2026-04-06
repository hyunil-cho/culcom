'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { staffApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import StaffForm, { emptyStaffForm, emptyRefundForm, validateStaffForm, type StaffFormData } from '../../StaffForm';
import { useResultModal } from '@/hooks/useResultModal';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function StaffEditPage() {
  const params = useParams();
  const router = useRouter();
  const seq = Number(params.seq);
  const [form, setForm] = useState<StaffFormData>(emptyStaffForm);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.COMPLEX_STAFFS });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([staffApi.get(seq), staffApi.getRefund(seq)]).then(([staffRes, refundRes]) => {
      const s = staffRes.data;
      const r = refundRes.data;
      setForm({
        name: s.name,
        phoneNumber: s.phoneNumber ?? '',
        email: s.email ?? '',
        subject: s.subject ?? '',
        status: s.status,
        interviewer: s.interviewer ?? '',
        paymentMethod: s.paymentMethod ?? '',
        comment: s.comment ?? '',
        refund: r ? {
          depositAmount: r.depositAmount ?? '',
          refundableDeposit: r.refundableDeposit ?? '',
          nonRefundableDeposit: r.nonRefundableDeposit ?? '',
          refundBank: r.refundBank ?? '',
          refundAccount: r.refundAccount ?? '',
          refundAmount: r.refundAmount ?? '',
        } : emptyRefundForm,
      });
    });
  }, [seq]);

  const handleSubmit = async () => {
    const error = validateStaffForm(form);
    if (error) { alert(error); return; }
    const r = form.refund;
    const hasRefund = r.depositAmount || r.refundableDeposit || r.nonRefundableDeposit
      || r.refundBank || r.refundAccount || r.refundAmount;
    if (hasRefund) {
      await staffApi.saveRefund(seq, {
        depositAmount: r.depositAmount || undefined,
        refundableDeposit: r.refundableDeposit || undefined,
        nonRefundableDeposit: r.nonRefundableDeposit || undefined,
        refundBank: r.refundBank || undefined,
        refundAccount: r.refundAccount || undefined,
        refundAmount: r.refundAmount || undefined,
      });
    }
    await run(staffApi.update(seq, {
      name: form.name,
      phoneNumber: form.phoneNumber || undefined,
      email: form.email || undefined,
      subject: form.subject || undefined,
      status: form.status,
      interviewer: form.interviewer || undefined,
      paymentMethod: form.paymentMethod || undefined,
      comment: form.comment || undefined,
    }), '스태프 정보가 수정되었습니다.');
  };

  return (
    <>
      <StaffForm form={form} onChange={setForm} onSubmit={handleSubmit}
        isEdit backHref={ROUTES.COMPLEX_STAFFS} submitLabel="수정" />
      {deleting && (
        <ConfirmModal title="삭제 확인" onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            setDeleting(false);
            await run(staffApi.delete(seq), '스태프가 삭제되었습니다.');
          }} confirmLabel="삭제" confirmColor="#f44336">
          이 스태프를 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.
        </ConfirmModal>
      )}
      {modal}
    </>
  );
}
