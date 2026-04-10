'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import FormField from '@/components/ui/FormField';
import FormLayout from '@/components/ui/FormLayout';
import { Input, PhoneInput, Select, Textarea, CurrencyInput } from '@/components/ui/FormInput';
import type { MembershipStatus } from '@/lib/api/complex';
import { useClassSlots } from '../hooks/useClassSlots';
import { usePaymentOptions } from '@/lib/usePaymentOptions';
import PaymentHistoryPanel from './PaymentHistoryPanel';

export interface MemberFormData {
  name: string;
  phoneNumber: string;
  level: string;
  language: string;
  info: string;
  chartNumber: string;
  signupChannel: string;
  interviewer: string;
  comment: string;
}

export interface StaffFormData {
  isStaff: boolean;
  status: string;
  refund: RefundFormData;
}

export interface RefundFormData {
  depositAmount: string;
  refundableDeposit: string;
  nonRefundableDeposit: string;
  refundBank: string;
  refundAccount: string;
  refundAmount: string;
  paymentMethod: string;
}

export interface MembershipFormData {
  membershipSeq: string;
  startDate: string;
  expiryDate: string;
  price: string;
  paymentDate: string;
  depositAmount: string;
  paymentMethod: string;
  status: MembershipStatus;
}

export interface ClassAssignData {
  timeSlotSeq: string;
  classSeq: string;
}

export const emptyMemberForm: MemberFormData = {
  name: '', phoneNumber: '', level: '', language: '', info: '',
  chartNumber: '', signupChannel: '', interviewer: '', comment: '',
};

function nowDateTimeLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export const emptyMembershipForm: MembershipFormData = {
  membershipSeq: '', startDate: '', expiryDate: '', price: '',
  paymentDate: nowDateTimeLocal(), depositAmount: '', paymentMethod: '',
  status: '활성',
};

export const emptyClassAssign: ClassAssignData = { timeSlotSeq: '', classSeq: '' };

export const emptyRefundForm: RefundFormData = {
  depositAmount: '', refundableDeposit: '', nonRefundableDeposit: '',
  refundBank: '', refundAccount: '', refundAmount: '', paymentMethod: '',
};

export const emptyStaffForm: StaffFormData = {
  isStaff: false, status: '재직', refund: emptyRefundForm,
};

export function validateMemberForm(form: MemberFormData): string | null {
  if (!form.name.trim()) return '이름을 입력하세요.';
  if (!form.phoneNumber.trim()) return '전화번호를 입력하세요.';
  return null;
}

/**
 * 멤버십 할당 토글이 켜졌을 때(=membershipSeq가 비어있지 않을 때) 호출.
 * 멤버십 섹션의 모든 입력 필드를 필수로 검증한다.
 * 토글이 꺼졌으면 useMemberForm.saveMembership에서 조기 return 되므로
 * 이 함수를 호출하지 않는다.
 */
export function validateMembershipForm(ms: MembershipFormData, isEdit: boolean, isTransfer?: boolean): string | null {
  if (!ms.membershipSeq) return '멤버십 등급을 선택하세요.';
  if (!ms.status) return '멤버십 상태를 선택하세요.';
  if (isTransfer) {
    if (!ms.paymentDate) return '양수금 납부일을 입력하세요.';
    if (!ms.paymentMethod) return '양수금 결제방법을 선택하세요.';
    return null;
  }
  if (!ms.price?.trim()) return '멤버십 금액을 입력하세요.';
  if (!ms.paymentDate) return '납부일을 입력하세요.';
  if (!ms.paymentMethod) return '결제방법을 선택하세요.';
  if (!isEdit && !ms.depositAmount?.trim()) return '첫 납부 금액을 입력하세요.';
  return null;
}

const SIGNUP_CHANNELS = ['인스타그램', '네이버 검색', '지인 소개', '전단지', '홈페이지'];
const STAFF_STATUS_OPTIONS = ['재직', '휴직', '퇴직'] as const;
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
  headerExtra,
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
}) {
  const { timeSlots, getClassesBySlot } = useClassSlots();
  const { methods: paymentMethods, banks: bankOptions } = usePaymentOptions();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabId | null) ?? 'basic';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const filteredClasses = getClassesBySlot(classAssign?.timeSlotSeq);

  const isStaff = staffForm?.isStaff ?? false;

  const signupSelectValue = SIGNUP_CHANNELS.includes(form.signupChannel) ? form.signupChannel : (form.signupChannel ? '기타' : '');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'basic', label: '기본정보' },
    { id: 'class', label: isStaff ? '담당수업 / 환급' : '수업 / 멤버십' },
    ...(isEdit && !isStaff && currentMemberSeq && membershipEnabled
      ? [{ id: 'payment' as TabId, label: '결제 / 미수금' }]
      : []),
  ];

  const paymentTabAvailable = isEdit && !isStaff && !!currentMemberSeq && membershipEnabled;
  const initialTabAppliedRef = useRef(initialTab !== 'payment');

  // 결제 탭이 사라졌는데 활성 탭이 그곳이면 기본 탭으로 돌린다.
  // URL 쿼리가 payment 였고 비동기 로드 때문에 첫 진입에서 사용 불가였다면,
  // 사용 가능해지는 순간 1회만 payment 로 전환 (이후 사용자가 다른 탭으로 이동하면 더 이상 강제하지 않음).
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
      {/* ── 탭 네비게이션 ── */}
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

      {/* ── 기본정보 탭 ── */}
      {activeTab === 'basic' && (
        <>
          {/* 스태프 토글 */}
          {staffForm && onStaffChange && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.8rem 1rem', marginBottom: '1rem',
              background: isStaff ? '#eef2ff' : '#f8f9fa',
              borderRadius: 8, border: `1px solid ${isStaff ? '#c7d2fe' : '#e9ecef'}`,
              transition: 'all 0.2s',
            }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: isStaff ? '#4a90e2' : '#666' }}>
                {isStaff ? '스태프로 등록' : '일반 회원으로 등록'}
              </span>
              <div
                title={isEdit
                  ? '회원/스태프 구분은 등록 후 변경할 수 없습니다.'
                  : '회원/스태프 구분은 진입 경로에 따라 자동 설정됩니다.'}
                style={{
                  width: 44, height: 24, borderRadius: 12, position: 'relative',
                  background: isStaff ? '#4a90e2' : '#dee2e6',
                  transition: 'background 0.2s',
                  cursor: 'not-allowed',
                  opacity: 0.6,
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 2,
                  left: isStaff ? 22 : 2,
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </div>
            </div>
          )}

          <FormField label="이름" required>
            <Input placeholder="이름을 입력하세요" value={form.name}
              onChange={(e) => onChange({ ...form, name: e.target.value })} required />
          </FormField>
          <FormField label="전화번호" required>
            <PhoneInput value={form.phoneNumber}
              onChange={(e) => onChange({ ...form, phoneNumber: e.target.value })} required />
          </FormField>
          <FormField label="레벨">
            <Input placeholder="예: 3-" value={form.level}
              onChange={(e) => onChange({ ...form, level: e.target.value })} />
          </FormField>
          <FormField label="언어">
            <Input placeholder="예: 영어, 일본어" value={form.language}
              onChange={(e) => onChange({ ...form, language: e.target.value })} />
          </FormField>
          <FormField label="가입 경로">
            <div>
              <Select value={signupSelectValue}
                onChange={(e) => {
                  if (e.target.value === '기타') onChange({ ...form, signupChannel: '기타' });
                  else onChange({ ...form, signupChannel: e.target.value });
                }}>
                <option value="">-- 선택 --</option>
                {SIGNUP_CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                <option value="기타">기타 (직접입력)</option>
              </Select>
              {form.signupChannel && !SIGNUP_CHANNELS.includes(form.signupChannel) && form.signupChannel !== '' && (
                <Input style={{ marginTop: 8 }} placeholder="가입 경로를 직접 입력하세요"
                  value={form.signupChannel === '기타' ? '' : form.signupChannel}
                  onChange={(e) => onChange({ ...form, signupChannel: e.target.value || '기타' })} />
              )}
            </div>
          </FormField>
          <FormField label="인터뷰어">
            <Input placeholder="인터뷰어 이름을 입력하세요" value={form.interviewer}
              onChange={(e) => onChange({ ...form, interviewer: e.target.value })} />
          </FormField>
          <FormField label="차트넘버">
            <Input placeholder="차트 번호를 입력하세요" value={form.chartNumber}
              onChange={(e) => onChange({ ...form, chartNumber: e.target.value })} />
          </FormField>
          <FormField label="인적사항">
            <Input placeholder="예: 대학생, 영어회화 관심" value={form.info}
                   onChange={(e) => onChange({ ...form, info: e.target.value })} />
          </FormField>
          <FormField label="코멘트">
            <Textarea style={{ height: 100 }} placeholder="직업, 관심사, 등록 동기 등 상세 정보를 입력하세요" value={form.comment}
              onChange={(e) => onChange({ ...form, comment: e.target.value })} />
          </FormField>

        </>
      )}

      {/* ── 두 번째 탭: 일반 회원 → 수업/멤버십, 스태프 → 담당수업/환급 ── */}
      {activeTab === 'class' && !isStaff && (
        <>
          {/* 멤버십 할당 — useMembership 훅에서 렌더링 */}
          {membershipSection}

          {/* 수업 배정 (멤버십이 할당된 경우에만 노출) */}
          {membershipEnabled && classAssign && onClassAssignChange && (
            <>
              <div style={{ borderTop: '2px solid #e9ecef', margin: '1.5rem 0 1rem', paddingTop: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#495057' }}>수업 배정</h3>
              </div>
              <FormField label="수업 시간대">
                <Select value={classAssign.timeSlotSeq}
                  onChange={(e) => onClassAssignChange({ timeSlotSeq: e.target.value, classSeq: '' })}>
                  <option value="">-- 시간대 선택 --</option>
                  {timeSlots.map(ts => (
                    <option key={ts.seq} value={ts.seq}>
                      {ts.name} ({ts.daysOfWeek} {ts.startTime} ~ {ts.endTime})
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="배정 수업">
                <Select value={classAssign.classSeq} disabled={!classAssign.timeSlotSeq}
                  onChange={(e) => onClassAssignChange({ ...classAssign, classSeq: e.target.value })}>
                  <option value="">{classAssign.timeSlotSeq ? '-- 수업 선택 --' : '-- 시간대를 먼저 선택하세요 --'}</option>
                  {filteredClasses.map(c => (
                    <option key={c.seq} value={c.seq}>{c.name}</option>
                  ))}
                </Select>
              </FormField>
            </>
          )}
        </>
      )}

      {activeTab === 'class' && isStaff && staffForm && onStaffChange && (
        <>
          {/* 스태프 상태 */}
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#495057' }}>스태프 상태</h3>
          <FormField label="상태">
            <Select value={staffForm.status}
              onChange={(e) => onStaffChange({ ...staffForm, status: e.target.value })}>
              {STAFF_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </FormField>

          {/* 담당 수업 배정 */}
          {staffClassAssign && onStaffClassAssignChange && (
            <>
              <div style={{ borderTop: '2px solid #e9ecef', margin: '1.5rem 0 1rem', paddingTop: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#495057' }}>담당 수업</h3>
              </div>
              <FormField label="수업 시간대">
                <Select value={staffClassAssign.timeSlotSeq}
                  onChange={(e) => onStaffClassAssignChange({ timeSlotSeq: e.target.value, classSeq: '' })}>
                  <option value="">-- 시간대 선택 --</option>
                  {timeSlots.map(ts => (
                    <option key={ts.seq} value={ts.seq}>
                      {ts.name} ({ts.daysOfWeek} {ts.startTime} ~ {ts.endTime})
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="배정 수업">
                <Select value={staffClassAssign.classSeq} disabled={!staffClassAssign.timeSlotSeq}
                  onChange={(e) => onStaffClassAssignChange({ ...staffClassAssign, classSeq: e.target.value })}>
                  <option value="">{staffClassAssign.timeSlotSeq ? '-- 수업 선택 --' : '-- 시간대를 먼저 선택하세요 --'}</option>
                  {getClassesBySlot(staffClassAssign.timeSlotSeq)
                    .filter(c => !c.staffSeq || c.staffSeq === currentMemberSeq)
                    .map(c => <option key={c.seq} value={c.seq}>{c.name}</option>)}
                </Select>
              </FormField>
            </>
          )}

          {/* 환급 정보 */}
          <div style={{ borderTop: '2px solid #e9ecef', margin: '1.5rem 0 1rem', paddingTop: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#495057' }}>환급 정보</h3>
          </div>
          <FormField label="결제방식">
            <Select value={staffForm.refund.paymentMethod}
              onChange={(e) => onStaffChange({ ...staffForm, refund: { ...staffForm.refund, paymentMethod: e.target.value } })}>
              <option value="">-- 선택 --</option>
              {paymentMethods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </FormField>
          <FormField label="디파짓 금액">
            <CurrencyInput placeholder="예: 500,000" value={staffForm.refund.depositAmount}
              onValueChange={(v) => onStaffChange({ ...staffForm, refund: { ...staffForm.refund, depositAmount: v } })} />
          </FormField>
          <FormField label="환급 예정 디파짓">
            <CurrencyInput placeholder="예: 300,000" value={staffForm.refund.refundableDeposit}
              onValueChange={(v) => onStaffChange({ ...staffForm, refund: { ...staffForm.refund, refundableDeposit: v } })} />
          </FormField>
          <FormField label="환급불가 디파짓">
            <CurrencyInput placeholder="예: 200,000" value={staffForm.refund.nonRefundableDeposit}
              onValueChange={(v) => onStaffChange({ ...staffForm, refund: { ...staffForm.refund, nonRefundableDeposit: v } })} />
          </FormField>
          <FormField label="환급 은행">
            <Select value={staffForm.refund.refundBank}
              onChange={(e) => onStaffChange({ ...staffForm, refund: { ...staffForm.refund, refundBank: e.target.value } })}>
              <option value="">-- 은행 선택 --</option>
              {bankOptions.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </Select>
          </FormField>
          <FormField label="환급 계좌번호">
            <Input placeholder="예: 110-123-456789" value={staffForm.refund.refundAccount}
              onChange={(e) => onStaffChange({ ...staffForm, refund: { ...staffForm.refund, refundAccount: e.target.value } })} />
          </FormField>
          <FormField label="환급 금액">
            <CurrencyInput placeholder="예: 200,000" value={staffForm.refund.refundAmount}
              onValueChange={(v) => onStaffChange({ ...staffForm, refund: { ...staffForm.refund, refundAmount: v } })} />
          </FormField>
        </>
      )}

      {/* ── 결제 / 미수금 탭 ── */}
      {activeTab === 'payment' && currentMemberSeq && (
        <PaymentHistoryPanel memberSeq={currentMemberSeq} memberName={form.name} />
      )}
    </FormLayout>
  );
}
