'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { memberApi, staffApi, classApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useResultModal } from '@/hooks/useResultModal';
import {
  emptyMemberForm, emptyMembershipForm, emptyClassAssign, emptyStaffForm, emptyRefundForm,
  validateMemberForm,
  type MemberFormData, type MembershipFormData, type ClassAssignData, type StaffFormData,
} from './MemberForm';
import { useClassSlots } from '../hooks/useClassSlots';

export function useMemberForm(seq?: number) {
  const isEdit = seq != null;
  const searchParams = useSearchParams();
  const staffMode = searchParams.get('staff') === 'true';

  const [form, setForm] = useState<MemberFormData>(emptyMemberForm);
  const [msForm, setMsForm] = useState<MembershipFormData>(emptyMembershipForm);
  const [classAssign, setClassAssign] = useState<ClassAssignData>(emptyClassAssign);
  const [staffForm, setStaffForm] = useState<StaffFormData>(() => ({
    ...emptyStaffForm,
    isStaff: staffMode,
  }));
  const [staffClassAssign, setStaffClassAssign] = useState<ClassAssignData>(emptyClassAssign);
  const { run, modal } = useResultModal({ redirectPath: staffMode ? ROUTES.COMPLEX_STAFFS : ROUTES.COMPLEX_MEMBERS });
  const { allClasses } = useClassSlots();

  useEffect(() => {
    if (!isEdit) return;
    memberApi.get(seq).then(res => {
      const m = res.data;
      setForm({
        name: m.name,
        phoneNumber: m.phoneNumber,
        level: m.level ?? '',
        language: m.language ?? '',
        info: m.info ?? '',
        chartNumber: m.chartNumber ?? '',
        signupChannel: m.signupChannel ?? '',
        interviewer: m.interviewer ?? '',
        comment: m.comment ?? '',
      });
      // staffStatus가 있으면 스태프
      if (m.staffStatus) {
        setStaffForm(prev => ({ ...prev, isStaff: true, status: m.staffStatus! }));
      }
    });
    // 기존 멤버십 로드
    memberApi.getMemberships(seq).then(res => {
      if (res.success && res.data.length > 0) {
        const ms = res.data[0]; // 최신 멤버십
        setMsForm({
          membershipSeq: String(ms.membershipSeq),
          startDate: ms.startDate ?? '',
          expiryDate: ms.expiryDate ?? '',
          price: ms.price ?? '',
          paymentDate: ms.paymentDate ?? '',
          depositAmount: '', // 수정 시에는 새 납부로 추가되지 않도록 비움
          paymentMethod: ms.paymentMethod ?? '',
          isActive: ms.isActive ?? true,
        });
        setMemberMembershipSeq(ms.seq);
      }
    });
    // 환급 정보 로드
    staffApi.getRefund(seq).then(refRes => {
      if (refRes.success && refRes.data) {
        const r = refRes.data;
        setStaffForm(prev => ({
          ...prev,
          refund: {
            depositAmount: r.depositAmount ?? '',
            refundableDeposit: r.refundableDeposit ?? '',
            nonRefundableDeposit: r.nonRefundableDeposit ?? '',
            refundBank: r.refundBank ?? '',
            refundAccount: r.refundAccount ?? '',
            refundAmount: r.refundAmount ?? '',
            paymentMethod: r.paymentMethod ?? '',
          },
        }));
      }
    }).catch(() => {});
    // 기존 수업 배정 로드
    memberApi.getClassMappings(seq).then(res => {
      if (res.success && res.data.length > 0) {
        const cm = res.data[0];
        setClassAssign({
          timeSlotSeq: cm.timeSlotSeq != null ? String(cm.timeSlotSeq) : '',
          classSeq: String(cm.classSeq),
        });
      }
    });
  }, [seq, isEdit]);

  // 스태프 수업 배정 로드
  useEffect(() => {
    if (!isEdit || allClasses.length === 0) return;
    const assigned = allClasses.find(c => c.staffSeq === seq);
    if (assigned) {
      setStaffClassAssign({
        timeSlotSeq: String(assigned.timeSlotSeq ?? ''),
        classSeq: String(assigned.seq),
      });
    }
  }, [seq, isEdit, allClasses]);

  const [memberMembershipSeq, setMemberMembershipSeq] = useState<number | null>(null);

  const buildMemberData = () => ({
    name: form.name,
    phoneNumber: form.phoneNumber,
    info: form.info || undefined,
    chartNumber: form.chartNumber || undefined,
    interviewer: form.interviewer || undefined,
    comment: form.comment || undefined,
  });

  const buildMetaData = () => ({
    level: form.level || undefined,
    language: form.language || undefined,
    signupChannel: (form.signupChannel && form.signupChannel !== '기타') ? form.signupChannel : undefined,
  });

  const saveMembership = async (memberSeq: number) => {
    if (!msForm.membershipSeq) return;
    const msData = {
      membershipSeq: Number(msForm.membershipSeq),
      startDate: msForm.startDate || undefined,
      expiryDate: msForm.expiryDate || undefined,
      price: msForm.price || undefined,
      paymentDate: msForm.paymentDate || undefined,
      depositAmount: msForm.depositAmount || undefined,
      paymentMethod: (msForm.paymentMethod && msForm.paymentMethod !== '기타') ? msForm.paymentMethod : undefined,
      isActive: msForm.isActive,
    };
    if (memberMembershipSeq) {
      await memberApi.updateMembership(memberSeq, memberMembershipSeq, msData);
    } else {
      await memberApi.assignMembership(memberSeq, msData);
    }
  };

  const saveClassAssign = async (memberSeq: number) => {
    if (!classAssign.classSeq) return;
    await memberApi.assignClass(memberSeq, Number(classAssign.classSeq));
  };

  const saveStaff = async (memberSeq: number) => {
    if (!staffForm.isStaff) return;
    // 스태프 정보 저장 (create 또는 update)
    await staffApi.update(memberSeq, {
      name: form.name,
      phoneNumber: form.phoneNumber,
      status: staffForm.status,
      interviewer: form.interviewer || undefined,
    });
    // 환급 정보 저장
    const r = staffForm.refund;
    const hasRefund = r.depositAmount || r.refundableDeposit || r.nonRefundableDeposit
      || r.refundBank || r.refundAccount || r.refundAmount || r.paymentMethod;
    if (hasRefund) {
      await staffApi.saveRefund(memberSeq, {
        depositAmount: r.depositAmount || undefined,
        refundableDeposit: r.refundableDeposit || undefined,
        nonRefundableDeposit: r.nonRefundableDeposit || undefined,
        refundBank: r.refundBank || undefined,
        refundAccount: r.refundAccount || undefined,
        refundAmount: r.refundAmount || undefined,
        paymentMethod: r.paymentMethod || undefined,
      });
    }
    // 스태프 수업 배정
    if (staffClassAssign.classSeq) {
      const classRes = await classApi.get(Number(staffClassAssign.classSeq));
      if (classRes.success && classRes.data) {
        const c = classRes.data;
        await classApi.update(c.seq, {
          name: c.name, description: c.description, capacity: c.capacity,
          sortOrder: c.sortOrder, timeSlotSeq: c.timeSlotSeq, staffSeq: memberSeq,
        });
      }
    }
  };

  const handleSubmit = async () => {
    const error = validateMemberForm(form);
    if (error) { alert(error); return; }

    if (isEdit) {
      await saveMembership(seq);
      if (classAssign.classSeq) {
        await memberApi.reassignClass(seq, Number(classAssign.classSeq));
      }
      await memberApi.updateMetaData(seq, buildMetaData());
      await saveStaff(seq);
      await run(memberApi.update(seq, buildMemberData()), '회원 정보가 수정되었습니다.');
    } else {
      const res = await memberApi.create(buildMemberData());
      if (!res.success) { alert(res.message || '회원 등록 실패'); return; }
      const memberSeq = res.data.seq;
      await memberApi.updateMetaData(memberSeq, buildMetaData());
      await saveMembership(memberSeq);
      await saveClassAssign(memberSeq);
      await saveStaff(memberSeq);
      await run(Promise.resolve(res), '회원이 등록되었습니다.');
    }
  };

  return {
    form, setForm, msForm, setMsForm, classAssign, setClassAssign,
    staffForm, setStaffForm, staffClassAssign, setStaffClassAssign,
    handleSubmit, run, modal, isEdit,
  };
}
