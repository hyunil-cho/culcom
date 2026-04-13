'use client';

import { useEffect, useState } from 'react';
import { memberApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useResultModal } from '@/hooks/useResultModal';
import {
  emptyMemberForm, emptyClassAssign,
  validateMemberForm,
  type MemberFormData, type ClassAssignData,
} from './MemberForm';
import { useMembership } from './useMembership';
import { useStaffForm } from './useStaffForm';
import { useClassSlots } from '../hooks/useClassSlots';

export function useMemberForm(seq?: number) {
  const isEdit = seq != null;

  const [form, setForm] = useState<MemberFormData>(emptyMemberForm);
  const { allClasses } = useClassSlots();
  const staff = useStaffForm({ seq, isEdit, allClasses });
  const membership = useMembership({ memberSeq: seq, isEdit, memberName: form.name, memberPhone: form.phoneNumber });
  const [classAssign, setClassAssign] = useState<ClassAssignData>(emptyClassAssign);
  const { run, modal } = useResultModal({ redirectPath: staff.staffMode ? ROUTES.COMPLEX_STAFFS : ROUTES.COMPLEX_MEMBERS });

  // 양도 불일치 모달 상태
  const [showTransferMismatch, setShowTransferMismatch] = useState(false);

  // 수정 모드: 회원 기본 정보 + 수업 배정 로드
  useEffect(() => {
    if (!isEdit || seq == null) return;
    memberApi.get(seq).then(res => {
      const m = res.data;
      setForm({
        name: m.name,
        phoneNumber: m.phoneNumber,
        level: m.level ?? '',
        language: m.language ?? '',
        info: m.info ?? '',
        signupChannel: m.signupChannel ?? '',
        comment: m.comment ?? '',
      });
      if (m.staffStatus) {
        staff.setStaffForm(prev => ({ ...prev, isStaff: true, status: m.staffStatus! }));
      }
    });
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

  const buildMemberData = () => ({
    name: form.name,
    phoneNumber: form.phoneNumber,
    info: form.info || undefined,
    comment: form.comment || undefined,
  });

  const buildMetaData = () => ({
    level: form.level || undefined,
    language: form.language || undefined,
    signupChannel: (form.signupChannel && form.signupChannel !== '기타') ? form.signupChannel : undefined,
  });

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
      await staff.saveStaff(seq, form.name, form.phoneNumber);
      await run(memberApi.update(seq, buildMemberData()), '회원 정보가 수정되었습니다.');
    } else if (staff.staffForm.isStaff) {
      const res = await staff.createStaff(form.name, form.phoneNumber, buildMetaData());
      if (!res.success) { alert(res.message || '스태프 등록 실패'); return; }
      await run(Promise.resolve(res), '스태프가 등록되었습니다.');
    } else {
      const res = await memberApi.create(buildMemberData());
      if (!res.success) { alert(res.message || '회원 등록 실패'); return; }
      const memberSeq = res.data.seq;
      await memberApi.updateMetaData(memberSeq, buildMetaData());
      await membership.save(memberSeq);
      if (classAssign.classSeq) {
        await memberApi.assignClass(memberSeq, Number(classAssign.classSeq));
      }
      const msg = res.data.smsWarning
        ? `회원이 등록되었습니다.\n(${res.data.smsWarning})`
        : '회원이 등록되었습니다.';
      await run(Promise.resolve(res), msg);
    }
  };

  const handleSubmit = async () => {
    const error = validateMemberForm(form);
    if (error) { alert(error); return; }
    const msError = membership.validate();
    if (msError) { alert(msError); return; }

    if (checkTransferMismatch()) {
      setShowTransferMismatch(true);
      return;
    }

    await doSubmit();
  };

  const confirmMismatchAndSubmit = async () => {
    setShowTransferMismatch(false);
    await doSubmit();
  };

  const dismissMismatch = () => {
    setShowTransferMismatch(false);
  };

  return {
    form, setForm, membership, classAssign, setClassAssign,
    staffForm: staff.staffForm, setStaffForm: staff.setStaffForm,
    staffClassAssign: staff.staffClassAssign, setStaffClassAssign: staff.setStaffClassAssign,
    handleSubmit, run, modal, isEdit,
    showTransferMismatch, confirmMismatchAndSubmit, dismissMismatch,
  };
}
