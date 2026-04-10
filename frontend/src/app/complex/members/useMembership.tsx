'use client';

import { useCallback, useEffect, useState } from 'react';
import { memberApi, membershipApi, type Membership } from '@/lib/api';
import { usePaymentOptions } from '@/lib/usePaymentOptions';
import MembershipInfoModal from './components/MembershipInfoModal';
import MembershipFormSection from './components/MembershipFormSection';
import { validateMembershipForm, type MembershipFormData } from './MemberForm';
import { useTransfer } from './useTransfer';

const EMPTY_FORM: MembershipFormData = {
  membershipSeq: '', startDate: '', expiryDate: '', price: '',
  paymentDate: '', depositAmount: '', paymentMethod: '',
  status: '활성',
};

interface UseMembershipOptions {
  memberSeq?: number;
  isEdit?: boolean;
  memberName?: string;
  memberPhone?: string;
}

/**
 * 멤버십 관련 상태·UI·로직을 통합하는 훅.
 */
export function useMembership(options?: UseMembershipOptions) {
  const { memberSeq, isEdit, memberName, memberPhone } = options ?? {};
  const { methods: paymentMethods } = usePaymentOptions();

  // ── 멤버십 상품 목록 ──
  const [memberships, setMemberships] = useState<Membership[]>([]);
  useEffect(() => {
    membershipApi.list().then(res => { if (res.success) setMemberships(res.data); });
  }, []);

  // ── 폼 상태 ──
  const [form, setForm] = useState<MembershipFormData>(EMPTY_FORM);
  const [enabled, setEnabled] = useState(false);
  const [memberMembershipSeq, setMemberMembershipSeq] = useState<number | null>(null);

  // ── 양도 (별도 훅) ──
  const transfer = useTransfer({
    memberships,
    setForm,
    setEnabled: (v: boolean) => setEnabled(v),
    emptyForm: EMPTY_FORM,
  });

  // 수정 모드: 기존 멤버십 로드
  useEffect(() => {
    if (!memberSeq) return;
    memberApi.getMemberships(memberSeq).then(res => {
      if (res.success && res.data.length > 0) {
        const ms = res.data[0];
        setForm({
          membershipSeq: String(ms.membershipSeq),
          startDate: ms.startDate ?? '',
          expiryDate: ms.expiryDate ?? '',
          price: ms.price ?? '',
          paymentDate: ms.paymentDate ?? '',
          depositAmount: '',
          paymentMethod: ms.paymentMethod ?? '',
          status: ms.status ?? '활성',
        });
        setMemberMembershipSeq(ms.seq);
      }
    });
  }, [memberSeq]);

  // membershipSeq가 채워지면 토글 자동 ON
  useEffect(() => {
    if (form.membershipSeq) setEnabled(true);
  }, [form.membershipSeq]);

  // ── 토글 ──
  const toggle = useCallback(() => {
    setEnabled(prev => {
      if (!prev) return true;
      setForm(f => ({ ...f, membershipSeq: '' }));
      return false;
    });
  }, []);

  // ── 멤버십 선택 시 만료일 자동 계산 ──
  const handleSelect = useCallback((membershipSeq: string) => {
    setForm(prev => {
      const updated = { ...prev, membershipSeq };
      if (membershipSeq) {
        const ms = memberships.find(m => m.seq === Number(membershipSeq));
        if (ms) {
          const d = new Date();
          d.setDate(d.getDate() + ms.duration);
          updated.expiryDate = d.toISOString().split('T')[0];
        }
      } else {
        updated.expiryDate = '';
      }
      return updated;
    });
  }, [memberships]);

  // ── 검증 ──
  const validate = useCallback((): string | null => {
    if (!form.membershipSeq) return null;
    const transferError = transfer.validate();
    if (transferError) return transferError;
    return validateMembershipForm(form, !!isEdit, transfer.mode);
  }, [form, isEdit, transfer]);

  // ── 저장 ──
  const save = useCallback(async (targetMemberSeq: number) => {
    if (!form.membershipSeq) return;

    // 양도 모드: 백엔드에서 멤버십 이전 처리 (양도자 비활성화 + 양수자 생성)
    if (transfer.mode && transfer.selected) {
      await transfer.confirmTransfer(targetMemberSeq);
      return;
    }

    // 신규 모드: 일반 멤버십 할당
    const msData = {
      membershipSeq: Number(form.membershipSeq),
      startDate: form.startDate || undefined,
      expiryDate: form.expiryDate || undefined,
      price: form.price || undefined,
      paymentDate: form.paymentDate || undefined,
      depositAmount: form.depositAmount || undefined,
      paymentMethod: (form.paymentMethod && form.paymentMethod !== '기타') ? form.paymentMethod : undefined,
      status: form.status,
    };
    if (memberMembershipSeq) {
      await memberApi.updateMembership(targetMemberSeq, memberMembershipSeq, msData);
    } else {
      await memberApi.assignMembership(targetMemberSeq, msData);
    }
  }, [form, memberMembershipSeq, transfer]);

  // ── 멤버십 정보 모달 ──
  const [infoModalState, setInfoModalState] = useState<{ seq: number; name: string } | null>(null);
  const openInfoModal = useCallback((seq: number, name: string) => setInfoModalState({ seq, name }), []);
  const infoModal = infoModalState ? (
    <MembershipInfoModal
      memberSeq={infoModalState.seq}
      memberName={infoModalState.name}
      onClose={() => setInfoModalState(null)}
    />
  ) : null;

  // ── 폼 섹션 JSX ──
  const isExisting = !!memberMembershipSeq;
  const formSection = (
    <MembershipFormSection
      form={form} setForm={setForm}
      enabled={enabled} onToggle={toggle}
      toggleLocked={!!isEdit && isExisting}
      isEdit={isEdit} isExisting={isExisting}
      memberships={memberships} paymentMethods={paymentMethods}
      onSelect={handleSelect}
      transferMode={transfer.mode}
      onTransferModeChange={transfer.setMode}
      transfers={transfer.transfers}
      selectedTransfer={transfer.selected}
      onSelectTransfer={transfer.select}
      memberName={memberName}
      memberPhone={memberPhone}
    />
  );

  return {
    form, setForm, enabled,
    formSection,
    openInfoModal, infoModal,
    save, validate,
    transferMode: transfer.mode,
    selectedTransfer: transfer.selected,
  };
}
