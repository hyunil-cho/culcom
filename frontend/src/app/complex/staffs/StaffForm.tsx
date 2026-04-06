'use client';

import FormField from '@/components/ui/FormField';
import FormLayout from '@/components/ui/FormLayout';
import { Input, PhoneInput, Select, Textarea, CurrencyInput } from '@/components/ui/FormInput';
import { useClassSlots } from '../hooks/useClassSlots';

const STATUS_OPTIONS = ['재직', '휴직', '퇴직'] as const;

const PAYMENT_OPTIONS = [
  '', '카드', '온라인구독', '온라인신용', '토스링크',
  '이체(개인통장)', '이체(법인통장)', '현금',
] as const;

const BANK_OPTIONS = [
  '', '국민은행', '신한은행', '우리은행', '하나은행',
  '농협은행', '기업은행', '카카오뱅크', '토스뱅크', '케이뱅크',
] as const;

export interface RefundFormData {
  depositAmount: string;
  refundableDeposit: string;
  nonRefundableDeposit: string;
  refundBank: string;
  refundAccount: string;
  refundAmount: string;
}

export interface ClassAssignData {
  timeSlotSeq: string;
  classSeq: string;
}

export interface StaffFormData {
  name: string;
  phoneNumber: string;
  status: string;
  interviewer: string;
  paymentMethod: string;
  comment: string;
  refund: RefundFormData;
}

export const emptyRefundForm: RefundFormData = {
  depositAmount: '',
  refundableDeposit: '',
  nonRefundableDeposit: '',
  refundBank: '',
  refundAccount: '',
  refundAmount: '',
};

export const emptyClassAssign: ClassAssignData = {
  timeSlotSeq: '',
  classSeq: '',
};

export const emptyStaffForm: StaffFormData = {
  name: '',
  phoneNumber: '',
  status: '재직',
  interviewer: '',
  paymentMethod: '',
  comment: '',
  refund: emptyRefundForm,
};

export function validateStaffForm(form: StaffFormData): string | null {
  if (!form.name.trim()) return '이름을 입력하세요.';
  if (!form.phoneNumber.trim()) return '전화번호를 입력하세요.';
  return null;
}

export default function StaffForm({
  form, onChange, onSubmit, isEdit, backHref, submitLabel,
  classAssign, onClassAssignChange, currentStaffSeq,
}: {
  form: StaffFormData;
  onChange: (form: StaffFormData) => void;
  onSubmit: () => void;
  isEdit?: boolean;
  backHref: string;
  submitLabel: string;
  classAssign?: ClassAssignData;
  onClassAssignChange?: (data: ClassAssignData) => void;
  currentStaffSeq?: number;
}) {
  const { timeSlots, getClassesBySlot } = useClassSlots();
  const filteredClasses = classAssign
    ? getClassesBySlot(classAssign.timeSlotSeq).filter(c => !c.staffSeq || c.staffSeq === currentStaffSeq)
    : [];

  return (
    <FormLayout
      title={submitLabel === '등록' ? '스태프 등록' : '스태프 정보 수정'}
      backHref={backHref} submitLabel={submitLabel}
      onSubmit={onSubmit} isEdit={isEdit}
    >
      <FormField label="이름" required>
        <Input placeholder="이름" value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })} required />
      </FormField>
      <FormField label="전화번호" required>
        <PhoneInput value={form.phoneNumber}
          onChange={(e) => onChange({ ...form, phoneNumber: e.target.value })} required />
      </FormField>
      <FormField label="상태">
        <Select value={form.status}
          onChange={(e) => onChange({ ...form, status: e.target.value })}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
      </FormField>
      <FormField label="인터뷰어">
        <Input placeholder="인터뷰어 이름을 입력하세요" value={form.interviewer}
          onChange={(e) => onChange({ ...form, interviewer: e.target.value })} />
      </FormField>
      <FormField label="결제방법">
        <Select value={form.paymentMethod}
          onChange={(e) => onChange({ ...form, paymentMethod: e.target.value })}>
          <option value="">-- 선택 --</option>
          {PAYMENT_OPTIONS.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
        </Select>
      </FormField>
      <FormField label="비고">
        <Textarea placeholder="스태프 특이사항 입력" value={form.comment}
          onChange={(e) => onChange({ ...form, comment: e.target.value })}
          style={{ height: 80, resize: 'vertical' }} />
      </FormField>

      {/* ── 수업 배정 (선택사항) ── */}
      {classAssign && onClassAssignChange && (
        <>
          <div style={{ borderTop: '2px solid #e9ecef', margin: '1.5rem 0 1rem', paddingTop: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#495057' }}>수업 배정 (선택사항)</h3>
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
                <option key={c.seq} value={c.seq}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormField>
        </>
      )}

      {/* ── 환급 정보 ── */}
      <div style={{ borderTop: '2px solid #e9ecef', margin: '1.5rem 0 1rem', paddingTop: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: '#495057' }}>환급 정보</h3>
      </div>
      <FormField label="디파짓 금액">
        <CurrencyInput placeholder="예: 500,000" value={form.refund.depositAmount}
          onValueChange={(v) => onChange({ ...form, refund: { ...form.refund, depositAmount: v } })} />
      </FormField>
      <FormField label="환급 예정 디파짓" hint="환급이 가능한 디파짓 금액을 입력하세요.">
        <CurrencyInput placeholder="예: 300,000" value={form.refund.refundableDeposit}
          onValueChange={(v) => onChange({ ...form, refund: { ...form.refund, refundableDeposit: v } })} />
      </FormField>
      <FormField label="환급불가 디파짓" hint="환급이 불가능한 디파짓 금액을 입력하세요.">
        <CurrencyInput placeholder="예: 200,000" value={form.refund.nonRefundableDeposit}
          onValueChange={(v) => onChange({ ...form, refund: { ...form.refund, nonRefundableDeposit: v } })} />
      </FormField>
      <FormField label="환급 은행">
        <Select value={form.refund.refundBank}
          onChange={(e) => onChange({ ...form, refund: { ...form.refund, refundBank: e.target.value } })}>
          <option value="">-- 은행 선택 --</option>
          {BANK_OPTIONS.filter(Boolean).map(b => <option key={b} value={b}>{b}</option>)}
        </Select>
      </FormField>
      <FormField label="환급 계좌번호">
        <Input placeholder="예: 110-123-456789" value={form.refund.refundAccount}
          onChange={(e) => onChange({ ...form, refund: { ...form.refund, refundAccount: e.target.value } })} />
      </FormField>
      <FormField label="환급 금액">
        <CurrencyInput placeholder="예: 200,000" value={form.refund.refundAmount}
          onValueChange={(v) => onChange({ ...form, refund: { ...form.refund, refundAmount: v } })} />
      </FormField>
    </FormLayout>
  );
}
