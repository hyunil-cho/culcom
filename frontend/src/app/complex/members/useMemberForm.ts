'use client';

import { useEffect, useState } from 'react';
import { memberApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useResultModal } from '@/hooks/useResultModal';
import {
  emptyMemberForm, emptyMembershipForm, emptyClassAssign,
  validateMemberForm,
  type MemberFormData, type MembershipFormData, type ClassAssignData,
} from './MemberForm';

export function useMemberForm(seq?: number) {
  const isEdit = seq != null;
  const [form, setForm] = useState<MemberFormData>(emptyMemberForm);
  const [msForm, setMsForm] = useState<MembershipFormData>(emptyMembershipForm);
  const [classAssign, setClassAssign] = useState<ClassAssignData>(emptyClassAssign);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.COMPLEX_MEMBERS });

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
          status: ms.status ?? '',
          depositAmount: ms.depositAmount ?? '',
          paymentMethod: ms.paymentMethod ?? '',
        });
        setMemberMembershipSeq(ms.seq);
      }
    });
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

  const [memberMembershipSeq, setMemberMembershipSeq] = useState<number | null>(null);

  const buildMemberData = () => ({
    name: form.name,
    phoneNumber: form.phoneNumber,
    level: form.level || undefined,
    language: form.language || undefined,
    info: form.info || undefined,
    chartNumber: form.chartNumber || undefined,
    signupChannel: (form.signupChannel && form.signupChannel !== '기타') ? form.signupChannel : undefined,
    interviewer: form.interviewer || undefined,
    comment: form.comment || undefined,
  });

  const saveMembership = async (memberSeq: number) => {
    if (!msForm.membershipSeq) return;
    const msData = {
      membershipSeq: Number(msForm.membershipSeq),
      startDate: msForm.startDate || undefined,
      expiryDate: msForm.expiryDate || undefined,
      price: msForm.price || undefined,
      paymentDate: msForm.paymentDate || undefined,
      status: msForm.status || undefined,
      depositAmount: msForm.depositAmount || undefined,
      paymentMethod: (msForm.paymentMethod && msForm.paymentMethod !== '기타') ? msForm.paymentMethod : undefined,
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

  const handleSubmit = async () => {
    const error = validateMemberForm(form);
    if (error) { alert(error); return; }

    if (isEdit) {
      await saveMembership(seq);
      if (classAssign.classSeq) {
        await memberApi.reassignClass(seq, Number(classAssign.classSeq));
      }
      await run(memberApi.update(seq, buildMemberData()), '회원 정보가 수정되었습니다.');
    } else {
      const res = await memberApi.create(buildMemberData());
      if (!res.success) { alert(res.message || '회원 등록 실패'); return; }
      const memberSeq = res.data.seq;
      await saveMembership(memberSeq);
      await saveClassAssign(memberSeq);
      await run(Promise.resolve(res), '회원이 등록되었습니다.');
    }
  };

  return { form, setForm, msForm, setMsForm, classAssign, setClassAssign, handleSubmit, run, modal, isEdit };
}
