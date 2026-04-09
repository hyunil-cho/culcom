'use client';

import { useCallback, useEffect, useState } from 'react';
import { memberApi, membershipApi, type Membership } from '@/lib/api';
import { usePaymentOptions } from '@/lib/usePaymentOptions';
import MembershipInfoModal from './components/MembershipInfoModal';
import MembershipFormSection from './components/MembershipFormSection';
import { validateMembershipForm, type MembershipFormData } from './MemberForm';

const EMPTY_FORM: MembershipFormData = {
  membershipSeq: '', startDate: '', expiryDate: '', price: '',
  paymentDate: '', depositAmount: '', paymentMethod: '',
  status: '활성',
};

interface UseMembershipOptions {
  memberSeq?: number;
  isEdit?: boolean;
}

/**
 * 멤버십 관련 상태·UI·로직을 통합하는 훅.
 *
 * 반환값:
 * - form / setForm / enabled — 멤버십 폼 상태
 * - formSection — 회원 등록/수정 폼에 삽입할 멤버십 섹션 JSX
 * - openInfoModal / infoModal — 멤버십 정보 모달
 * - save(memberSeq) — 멤버십 저장 (생성 또는 수정)
 * - validate() — 폼 검증 (에러 메시지 또는 null)
 */
export function useMembership(options?: UseMembershipOptions) {
  const { memberSeq, isEdit } = options ?? {};
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
    return validateMembershipForm(form, !!isEdit);
  }, [form, isEdit]);

  // ── 저장 ──
  const save = useCallback(async (targetMemberSeq: number) => {
    if (!form.membershipSeq) return;
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
  }, [form, memberMembershipSeq]);

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
    />
  );

  return {
    form, setForm, enabled,
    formSection,
    openInfoModal, infoModal,
    save, validate,
  };
}
