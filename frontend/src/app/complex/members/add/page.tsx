'use client';

import { useState } from 'react';
import { memberApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import MemberForm, {
  emptyMemberForm, emptyMembershipForm, emptyClassAssign,
  validateMemberForm, type MemberFormData, type MembershipFormData, type ClassAssignData,
} from '../MemberForm';
import { useResultModal } from '@/hooks/useResultModal';

export default function MemberAddPage() {
  const [form, setForm] = useState<MemberFormData>(emptyMemberForm);
  const [msForm, setMsForm] = useState<MembershipFormData>(emptyMembershipForm);
  const [classAssign, setClassAssign] = useState<ClassAssignData>(emptyClassAssign);
  const { run, modal } = useResultModal({ redirectPath: ROUTES.COMPLEX_MEMBERS });

  const handleSubmit = async () => {
    const error = validateMemberForm(form);
    if (error) { alert(error); return; }

    // 1. 회원 생성
    const res = await memberApi.create({
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

    if (!res.success) { alert(res.message || '회원 등록 실패'); return; }
    const memberSeq = res.data.seq;

    // 2. 멤버십 할당 (선택)
    if (msForm.membershipSeq) {
      await memberApi.assignMembership(memberSeq, {
        membershipSeq: Number(msForm.membershipSeq),
        startDate: msForm.startDate || undefined,
        expiryDate: msForm.expiryDate || undefined,
        price: msForm.price || undefined,
        paymentDate: msForm.paymentDate || undefined,
        status: msForm.status || undefined,
        depositAmount: msForm.depositAmount || undefined,
        paymentMethod: (msForm.paymentMethod && msForm.paymentMethod !== '기타') ? msForm.paymentMethod : undefined,
      });
    }

    // 3. 수업 배정 (선택)
    if (classAssign.classSeq) {
      await memberApi.assignClass(memberSeq, Number(classAssign.classSeq));
    }

    await run(Promise.resolve(res), '회원이 등록되었습니다.');
  };

  return (
    <>
      <MemberForm form={form} onChange={setForm} onSubmit={handleSubmit}
        backHref={ROUTES.COMPLEX_MEMBERS} submitLabel="등록"
        membershipForm={msForm} onMembershipChange={setMsForm}
        classAssign={classAssign} onClassAssignChange={setClassAssign}
      />
      {modal}
    </>
  );
}
