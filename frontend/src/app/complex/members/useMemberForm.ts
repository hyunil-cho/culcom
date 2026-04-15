'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { memberApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useApiQuery } from '@/hooks/useApiQuery';
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
  const [formError, setFormError] = useState<string | null>(null);
  const clearFormError = useCallback(() => setFormError(null), []);
  const { allClasses } = useClassSlots();
  const staff = useStaffForm({ seq, isEdit, allClasses });
  const membership = useMembership({ memberSeq: seq, isEdit, memberName: form.name, memberPhone: form.phoneNumber });
  const [classAssign, setClassAssign] = useState<ClassAssignData>(emptyClassAssign);
  const { run, modal } = useResultModal({ redirectPath: staff.staffMode ? ROUTES.COMPLEX_STAFFS : ROUTES.COMPLEX_MEMBERS, invalidateKeys: ['members', 'staffs'] });

  // 양도 불일치 모달 상태
  const [showTransferMismatch, setShowTransferMismatch] = useState(false);

  // 신규 등록 시 이름+전화번호로 대기 양도 자동 감지 (디바운스 500ms)
  const pendingCheckTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (isEdit) return;
    if (!form.name.trim() || !form.phoneNumber.trim()) return;
    clearTimeout(pendingCheckTimer.current);
    pendingCheckTimer.current = setTimeout(() => {
      membership.checkPendingTransfer(form.name, form.phoneNumber);
    }, 500);
    return () => clearTimeout(pendingCheckTimer.current);
  }, [form.name, form.phoneNumber, isEdit]);

  // 수정 모드: 회원 기본 정보 로드
  const { data: memberData } = useApiQuery(
    ['member', seq],
    () => memberApi.get(seq!),
    { enabled: isEdit && seq != null },
  );
  const memberDataLoaded = useRef(false);
  useEffect(() => {
    if (!memberData || memberDataLoaded.current) return;
    memberDataLoaded.current = true;
    const m = memberData;
    setForm({
      name: m.name,
      phoneNumber: m.phoneNumber,
      level: m.level ?? '',
      language: m.language ?? '',
      interviewer: m.interviewer ?? '',
      info: m.info ?? '',
      signupChannel: m.signupChannel ?? '',
      comment: m.comment ?? '',
    });
    if (m.staffStatus) {
      staff.setStaffForm(prev => ({ ...prev, isStaff: true, status: m.staffStatus! }));
    }
  }, [memberData]);

  // 수정 모드: 수업 배정 로드
  const { data: classMappings } = useApiQuery(
    ['memberClassMappings', seq],
    () => memberApi.getClassMappings(seq!),
    { enabled: isEdit && seq != null },
  );
  const classMappingsLoaded = useRef(false);
  useEffect(() => {
    if (!classMappings || classMappingsLoaded.current) return;
    classMappingsLoaded.current = true;
    if (classMappings.length > 0) {
      const cm = classMappings[0];
      setClassAssign({
        timeSlotSeq: cm.timeSlotSeq != null ? String(cm.timeSlotSeq) : '',
        classSeq: String(cm.classSeq),
      });
    }
  }, [classMappings]);

  const buildMemberData = () => ({
    name: form.name,
    phoneNumber: form.phoneNumber,
    info: form.info || undefined,
    comment: form.comment || undefined,
  });

  const buildMetaData = () => ({
    level: form.level || undefined,
    language: form.language || undefined,
    interviewer: form.interviewer || undefined,
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
      if (!res.success) { setFormError(res.message || '스태프 등록 실패'); return; }
      await run(Promise.resolve(res), '스태프가 등록되었습니다.');
    } else {
      const res = await memberApi.create(buildMemberData());
      if (!res.success) { setFormError(res.message || '회원 등록 실패'); return; }
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
    if (error) { setFormError(error); return; }
    const msError = membership.validate();
    if (msError) { setFormError(msError); return; }
    clearFormError();

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
    formError, clearFormError,
  };
}
