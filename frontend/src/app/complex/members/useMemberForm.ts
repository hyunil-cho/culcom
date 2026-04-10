'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { memberApi, staffApi, classApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useResultModal } from '@/hooks/useResultModal';
import {
  emptyMemberForm, emptyClassAssign, emptyStaffForm, emptyRefundForm,
  validateMemberForm,
  type MemberFormData, type ClassAssignData, type StaffFormData,
} from './MemberForm';
import { useMembership } from './useMembership';
import { useClassSlots } from '../hooks/useClassSlots';

export function useMemberForm(seq?: number) {
  const isEdit = seq != null;
  const searchParams = useSearchParams();
  const staffMode = searchParams.get('staff') === 'true';

  const [form, setForm] = useState<MemberFormData>(emptyMemberForm);
  const membership = useMembership({ memberSeq: seq, isEdit, memberName: form.name, memberPhone: form.phoneNumber });
  const [classAssign, setClassAssign] = useState<ClassAssignData>(emptyClassAssign);
  const [staffForm, setStaffForm] = useState<StaffFormData>(() => ({
    ...emptyStaffForm,
    isStaff: staffMode,
  }));
  const [staffClassAssign, setStaffClassAssign] = useState<ClassAssignData>(emptyClassAssign);
  const { run, modal } = useResultModal({ redirectPath: staffMode ? ROUTES.COMPLEX_STAFFS : ROUTES.COMPLEX_MEMBERS });
  const { allClasses } = useClassSlots();

  // 양도 불일치 모달 상태
  const [showTransferMismatch, setShowTransferMismatch] = useState(false);

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

  const saveClassAssign = async (memberSeq: number) => {
    if (!classAssign.classSeq) return;
    await memberApi.assignClass(memberSeq, Number(classAssign.classSeq));
  };

  const saveStaff = async (memberSeq: number) => {
    if (!staffForm.isStaff) return;
    await staffApi.update(memberSeq, {
      name: form.name,
      phoneNumber: form.phoneNumber,
      status: staffForm.status,
      interviewer: form.interviewer || undefined,
    });
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

  /** 양도 불일치 여부 확인 */
  const checkTransferMismatch = (): boolean => {
    if (!membership.transferMode || !membership.selectedTransfer) return false;
    const t = membership.selectedTransfer;
    return form.name.trim() !== t.fromMemberName || form.phoneNumber !== t.fromMemberPhone;
  };

  /** 실제 저장 로직 */
  const doSubmit = async () => {
    if (isEdit) {
      await membership.save(seq);
      if (classAssign.classSeq) {
        await memberApi.reassignClass(seq, Number(classAssign.classSeq));
      }
      await memberApi.updateMetaData(seq, buildMetaData());
      await saveStaff(seq);
      await run(memberApi.update(seq, buildMemberData()), '회원 정보가 수정되었습니다.');
    } else if (staffForm.isStaff) {
      const res = await staffApi.create({
        name: form.name,
        phoneNumber: form.phoneNumber,
        status: staffForm.status,
        interviewer: form.interviewer || undefined,
      });
      if (!res.success) { alert(res.message || '스태프 등록 실패'); return; }
      const memberSeq = res.data.seq;
      await memberApi.updateMetaData(memberSeq, buildMetaData());
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
      await run(Promise.resolve(res), '스태프가 등록되었습니다.');
    } else {
      const res = await memberApi.create(buildMemberData());
      if (!res.success) { alert(res.message || '회원 등록 실패'); return; }
      const memberSeq = res.data.seq;
      await memberApi.updateMetaData(memberSeq, buildMetaData());
      await membership.save(memberSeq);
      await saveClassAssign(memberSeq);
      await run(Promise.resolve(res), '회원이 등록되었습니다.');
    }
  };

  const handleSubmit = async () => {
    const error = validateMemberForm(form);
    if (error) { alert(error); return; }
    // 멤버십 검증 (useMembership 훅의 validate 사용)
    const msError = membership.validate();
    if (msError) { alert(msError); return; }

    // 양도 모드: 이름/전화번호 불일치 확인
    if (checkTransferMismatch()) {
      setShowTransferMismatch(true);
      return;
    }

    await doSubmit();
  };

  /** 불일치 경고 후 강제 진행 */
  const confirmMismatchAndSubmit = async () => {
    setShowTransferMismatch(false);
    await doSubmit();
  };

  const dismissMismatch = () => {
    setShowTransferMismatch(false);
  };

  return {
    form, setForm, membership, classAssign, setClassAssign,
    staffForm, setStaffForm, staffClassAssign, setStaffClassAssign,
    handleSubmit, run, modal, isEdit,
    showTransferMismatch, confirmMismatchAndSubmit, dismissMismatch,
  };
}
