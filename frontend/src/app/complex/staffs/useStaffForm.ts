'use client';

import { useEffect, useState } from 'react';
import { staffApi, classApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useResultModal } from '@/hooks/useResultModal';
import { useClassSlots } from '../hooks/useClassSlots';
import {
  emptyStaffForm, emptyClassAssign, emptyRefundForm,
  validateStaffForm,
  type StaffFormData, type ClassAssignData,
} from './StaffForm';

export function useStaffForm(seq?: number) {
  const isEdit = seq != null;
  const [form, setForm] = useState<StaffFormData>(emptyStaffForm);
  const [classAssign, setClassAssign] = useState<ClassAssignData>(emptyClassAssign);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.COMPLEX_STAFFS });
  const { allClasses } = useClassSlots();

  useEffect(() => {
    if (!isEdit) return;
    Promise.all([staffApi.get(seq), staffApi.getRefund(seq)]).then(([staffRes, refundRes]) => {
      const s = staffRes.data;
      const r = refundRes.data;
      setForm({
        name: s.name,
        phoneNumber: s.phoneNumber ?? '',

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
  }, [seq, isEdit]);

  // 수정 모드: 기존 수업 배정 정보 로드
  useEffect(() => {
    if (!isEdit || allClasses.length === 0) return;
    const assigned = allClasses.find(c => c.staffSeq === seq);
    if (assigned) {
      setClassAssign({
        timeSlotSeq: String(assigned.timeSlotSeq ?? ''),
        classSeq: String(assigned.seq),
      });
    }
  }, [seq, isEdit, allClasses]);

  const saveRefund = async (staffSeq: number) => {
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
  };

  const saveClassAssign = async (staffSeq: number) => {
    if (!classAssign.classSeq) return;
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
  };

  const handleSubmit = async () => {
    const error = validateStaffForm(form);
    if (error) { alert(error); return; }

    const staffData = {
      name: form.name,
      phoneNumber: form.phoneNumber || undefined,

      status: form.status,
      interviewer: form.interviewer || undefined,
      paymentMethod: form.paymentMethod || undefined,
      comment: form.comment || undefined,
    };

    if (isEdit) {
      await saveRefund(seq);
      await saveClassAssign(seq);
      await run(staffApi.update(seq, staffData), '스태프 정보가 수정되었습니다.');
    } else {
      const res = await staffApi.create(staffData);
      if (res.success && res.data) {
        const staffSeq = res.data.seq;
        await saveRefund(staffSeq);
        await saveClassAssign(staffSeq);
      }
      await run(Promise.resolve(res), '스태프가 등록되었습니다.');
    }
  };

  return { form, setForm, classAssign, setClassAssign, handleSubmit, run, modal, isEdit };
}
