'use client';

import FormField from '@/components/ui/FormField';
import FormLayout from '@/components/ui/FormLayout';
import { Input, PhoneInput, EmailInput, Select } from '@/components/ui/FormInput';

const STATUS_OPTIONS = ['재직', '휴직', '퇴직'] as const;

export interface StaffFormData {
  name: string;
  phoneNumber: string;
  email: string;
  subject: string;
  status: string;
}

export const emptyStaffForm: StaffFormData = {
  name: '',
  phoneNumber: '',
  email: '',
  subject: '',
  status: '재직',
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
    </FormLayout>
  );
}
