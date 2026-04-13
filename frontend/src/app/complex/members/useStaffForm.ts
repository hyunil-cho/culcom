'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { staffApi, classApi, memberApi, type ComplexClass } from '@/lib/api';
import {
  emptyStaffForm, emptyClassAssign,
  type StaffFormData, type ClassAssignData,
} from './memberFormTypes';

interface UseStaffFormOptions {
  seq?: number;
  isEdit: boolean;
  allClasses: ComplexClass[];
}

export function useStaffForm({ seq, isEdit, allClasses }: UseStaffFormOptions) {
  const searchParams = useSearchParams();
  const staffMode = searchParams.get('staff') === 'true';

  const [staffForm, setStaffForm] = useState<StaffFormData>(() => ({
    ...emptyStaffForm,
    isStaff: staffMode,
  }));
  const [staffClassAssign, setStaffClassAssign] = useState<ClassAssignData>(emptyClassAssign);

  // 수정 모드: 환급 정보 로드
  useEffect(() => {
    if (!isEdit || seq == null) return;
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
  }, [seq, isEdit]);

  // 수정 모드: 스태프 수업 배정 로드
  useEffect(() => {
    if (!isEdit || seq == null || allClasses.length === 0) return;
    const assigned = allClasses.find(c => c.staffSeq === seq);
    if (assigned) {
      setStaffClassAssign({
        timeSlotSeq: String(assigned.timeSlotSeq ?? ''),
        classSeq: String(assigned.seq),
      });
    }
  }, [seq, isEdit, allClasses]);

  /** 환급 정보 저장 */
  const saveRefund = async (memberSeq: number) => {
    const r = staffForm.refund;
    const hasRefund = r.depositAmount || r.refundableDeposit || r.nonRefundableDeposit
      || r.refundBank || r.refundAccount || r.refundAmount || r.paymentMethod;
    if (!hasRefund) return;
    await staffApi.saveRefund(memberSeq, {
      depositAmount: r.depositAmount || undefined,
      refundableDeposit: r.refundableDeposit || undefined,
      nonRefundableDeposit: r.nonRefundableDeposit || undefined,
      refundBank: r.refundBank || undefined,
      refundAccount: r.refundAccount || undefined,
      refundAmount: r.refundAmount || undefined,
      paymentMethod: r.paymentMethod || undefined,
    });
  };

  /** 스태프 수업 배정 저장 */
  const saveStaffClass = async (memberSeq: number) => {
    if (!staffClassAssign.classSeq) return;
    const classRes = await classApi.get(Number(staffClassAssign.classSeq));
    if (classRes.success && classRes.data) {
      const c = classRes.data;
      await classApi.update(c.seq, {
        name: c.name, description: c.description, capacity: c.capacity,
        sortOrder: c.sortOrder, timeSlotSeq: c.timeSlotSeq, staffSeq: memberSeq,
      });
    }
  };

  /** 수정 모드: 스태프 정보 + 환급 + 수업 배정 일괄 저장 */
  const saveStaff = async (memberSeq: number, name: string, phone: string) => {
    if (!staffForm.isStaff) return;
    await staffApi.update(memberSeq, { name, phoneNumber: phone, status: staffForm.status });
    await saveRefund(memberSeq);
    await saveStaffClass(memberSeq);
  };

  /** 신규 모드: 스태프 생성 + 메타데이터 + 환급 + 수업 배정 */
  const createStaff = async (name: string, phone: string, metaData: Record<string, string | undefined>) => {
    const res = await staffApi.create({ name, phoneNumber: phone, status: staffForm.status });
    if (!res.success) return res;
    const memberSeq = res.data.seq;
    await memberApi.updateMetaData(memberSeq, metaData);
    await saveRefund(memberSeq);
    await saveStaffClass(memberSeq);
    return res;
  };

  return {
    staffForm, setStaffForm,
    staffClassAssign, setStaffClassAssign,
    staffMode,
    saveStaff,
    createStaff,
  };
}
