'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import FormLayout from '@/components/ui/FormLayout';
import FormErrorBanner from '@/components/ui/FormErrorBanner';
import BasicInfoTab from './tabs/BasicInfoTab';
import ClassTab from './tabs/ClassTab';
import StaffTab from './tabs/StaffTab';
import PaymentHistoryPanel from './PaymentHistoryPanel';
import type { MemberFormData, StaffFormData, ClassAssignData } from './memberFormTypes';

// 기존 import 호환을 위한 re-export
export type { MemberFormData, StaffFormData, RefundFormData, MembershipFormData, ClassAssignData } from './memberFormTypes';
export { emptyMemberForm, emptyMembershipForm, emptyClassAssign, emptyRefundForm, emptyStaffForm, validateMemberForm, validateMembershipForm } from './memberFormTypes';

type TabId = 'basic' | 'class' | 'payment';

const TAB_STYLE = {
  base: {
    padding: '10px 20px', border: 'none', borderBottom: '3px solid transparent',
    background: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600,
    color: '#999', transition: 'all 0.2s',
  } as React.CSSProperties,
  active: {
    color: '#4a90e2', borderBottomColor: '#4a90e2',
  } as React.CSSProperties,
};

export default function MemberForm({
  form, onChange, onSubmit, isEdit, backHref, submitLabel,
  membershipSection, membershipEnabled,
  classAssign, onClassAssignChange,
  staffForm, onStaffChange,
  staffClassAssign, onStaffClassAssignChange, currentMemberSeq,
  headerExtra, formError,
}: {
  form: MemberFormData;
  onChange: (form: MemberFormData) => void;
  onSubmit: () => void;
  isEdit?: boolean;
  backHref: string;
  submitLabel: string;
  membershipSection?: React.ReactNode;
  membershipEnabled?: boolean;
  classAssign?: ClassAssignData;
  onClassAssignChange?: (f: ClassAssignData) => void;
  staffForm?: StaffFormData;
  onStaffChange?: (f: StaffFormData) => void;
  staffClassAssign?: ClassAssignData;
  onStaffClassAssignChange?: (f: ClassAssignData) => void;
  currentMemberSeq?: number;
  headerExtra?: React.ReactNode;
  formError?: string | null;
}) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabId | null) ?? 'basic';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const isStaff = staffForm?.isStaff ?? false;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'basic', label: '기본정보' },
    { id: 'class', label: isStaff ? '담당수업 / 환급' : '수업 / 멤버십' },
    ...(isEdit && !isStaff && currentMemberSeq && membershipEnabled
      ? [{ id: 'payment' as TabId, label: '결제 / 미수금' }]
      : []),
  ];

  const paymentTabAvailable = isEdit && !isStaff && !!currentMemberSeq && membershipEnabled;
  const initialTabAppliedRef = useRef(initialTab !== 'payment');

  useEffect(() => {
    if (!initialTabAppliedRef.current && paymentTabAvailable) {
      setActiveTab('payment');
      initialTabAppliedRef.current = true;
      return;
    }
    if (activeTab === 'payment' && !paymentTabAvailable) {
      setActiveTab('basic');
    }
  }, [activeTab, paymentTabAvailable]);

  return (
    <FormLayout
      title={submitLabel === '등록' ? '새 회원 등록' : '회원 정보 수정'}
      backHref={backHref} submitLabel={submitLabel}
      onSubmit={onSubmit} isEdit={isEdit}
      headerExtra={headerExtra}
    >
      <FormErrorBanner error={formError ?? null} />
      {/* 탭 네비게이션 */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e9ecef', marginBottom: '1.5rem' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ ...TAB_STYLE.base, ...(activeTab === tab.id ? TAB_STYLE.active : {}) }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'basic' && (
        <BasicInfoTab form={form} onChange={onChange} isEdit={isEdit}
          staffForm={staffForm} onStaffChange={onStaffChange} />
      )}

      {activeTab === 'class' && !isStaff && (
        <ClassTab
          membershipSection={membershipSection} membershipEnabled={membershipEnabled}
          classAssign={classAssign} onClassAssignChange={onClassAssignChange} />
      )}

      {activeTab === 'class' && isStaff && staffForm && onStaffChange && (
        <StaffTab staffForm={staffForm} onStaffChange={onStaffChange}
          staffClassAssign={staffClassAssign} onStaffClassAssignChange={onStaffClassAssignChange}
          currentMemberSeq={currentMemberSeq} />
      )}

      {activeTab === 'payment' && currentMemberSeq && (
        <PaymentHistoryPanel memberSeq={currentMemberSeq} memberName={form.name} />
      )}
    </FormLayout>
  );
}
