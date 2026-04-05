'use client';

import FormField from '@/components/ui/FormField';
import FormLayout from '@/components/ui/FormLayout';
import { Input, PhoneInput, EmailInput, Select, Textarea } from '@/components/ui/FormInput';

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

export interface StaffFormData {
  name: string;
  phoneNumber: string;
  email: string;
  subject: string;
  status: string;
  joinDate: string;
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

export const emptyStaffForm: StaffFormData = {
  name: '',
  phoneNumber: '',
  email: '',
  subject: '',
  status: '재직',
  joinDate: '',
  interviewer: '',
  paymentMethod: '',
  comment: '',
  refund: emptyRefundForm,
};

export function validateStaffForm(form: StaffFormData): string | null {
  if (!form.name.trim()) return '이름을 입력하세요.';
  return null;
}

export default function StaffForm({
  form, onChange, onSubmit, isEdit, backHref, submitLabel,
}: {
  form: StaffFormData;
  onChange: (form: StaffFormData) => void;
  onSubmit: () => void;
  isEdit?: boolean;
  backHref: string;
  submitLabel: string;
}) {
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
      <FormField label="전화번호">
        <PhoneInput value={form.phoneNumber}
          onChange={(e) => onChange({ ...form, phoneNumber: e.target.value })} />
      </FormField>
      <FormField label="이메일">
        <EmailInput value={form.email}
          onChange={(e) => onChange({ ...form, email: e.target.value })} />
      </FormField>
      <FormField label="담당 과목">
        <Input placeholder="예: 영어, 수학" value={form.subject}
          onChange={(e) => onChange({ ...form, subject: e.target.value })} />
      </FormField>
      <FormField label="상태">
        <Select value={form.status}
          onChange={(e) => onChange({ ...form, status: e.target.value })}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
      </FormField>
      <FormField label="등록일">
        <Input type="date" value={form.joinDate}
          onChange={(e) => onChange({ ...form, joinDate: e.target.value })} />
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

      {/* 환급 정보 섹션 */}
      <div style={{
        margin: '2rem 0 0', padding: '1.5rem',
        background: '#fef9f0', border: '1.5px solid #f0dcc0', borderRadius: 10,
      }}>
        <div style={{
          fontSize: '1rem', fontWeight: 700, color: '#b8860b',
          marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          환급 정보
        </div>
        <FormField label="디파짓 금액">
          <Input placeholder="예: 500,000" value={form.refund.depositAmount}
            onChange={(e) => onChange({ ...form, refund: { ...form.refund, depositAmount: e.target.value } })} />
        </FormField>
        <FormField label="환급 예정 디파짓" hint="환급이 가능한 디파짓 금액을 입력하세요.">
          <Input placeholder="예: 300,000" value={form.refund.refundableDeposit}
            onChange={(e) => onChange({ ...form, refund: { ...form.refund, refundableDeposit: e.target.value } })} />
        </FormField>
        <FormField label="환급불가 디파짓" hint="환급이 불가능한 디파짓 금액을 입력하세요.">
          <Input placeholder="예: 200,000" value={form.refund.nonRefundableDeposit}
            onChange={(e) => onChange({ ...form, refund: { ...form.refund, nonRefundableDeposit: e.target.value } })} />
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
          <Input placeholder="예: 200,000" value={form.refund.refundAmount}
            onChange={(e) => onChange({ ...form, refund: { ...form.refund, refundAmount: e.target.value } })} />
        </FormField>
      </div>
    </FormLayout>
  );
}
