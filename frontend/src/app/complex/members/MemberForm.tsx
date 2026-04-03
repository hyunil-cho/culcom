'use client';

import FormField from '@/components/ui/FormField';
import FormLayout from '@/components/ui/FormLayout';
import { Input, PhoneInput, Textarea } from '@/components/ui/FormInput';

export interface MemberFormData {
  name: string;
  phoneNumber: string;
  level: string;
  language: string;
  chartNumber: string;
  comment: string;
}

export const emptyMemberForm: MemberFormData = {
  name: '',
  phoneNumber: '',
  level: '',
  language: '',
  chartNumber: '',
  comment: '',
};

export function validateMemberForm(form: MemberFormData): string | null {
  if (!form.name.trim()) return '이름을 입력하세요.';
  if (!form.phoneNumber.trim()) return '전화번호를 입력하세요.';
  return null;
}

export default function MemberForm({
  form, onChange, onSubmit, isEdit, backHref, submitLabel,
}: {
  form: MemberFormData;
  onChange: (form: MemberFormData) => void;
  onSubmit: () => void;
  isEdit?: boolean;
  backHref: string;
  submitLabel: string;
}) {
  return (
    <FormLayout
      title={submitLabel === '등록' ? '회원 등록' : '회원 정보 수정'}
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
      <FormField label="레벨">
        <Input placeholder="예: 초급, 중급" value={form.level}
          onChange={(e) => onChange({ ...form, level: e.target.value })} />
      </FormField>
      <FormField label="언어">
        <Input placeholder="예: 영어, 일본어" value={form.language}
          onChange={(e) => onChange({ ...form, language: e.target.value })} />
      </FormField>
      <FormField label="차트번호">
        <Input placeholder="차트번호" value={form.chartNumber}
          onChange={(e) => onChange({ ...form, chartNumber: e.target.value })} />
      </FormField>
      <FormField label="메모">
        <Textarea style={{ height: 80 }} placeholder="메모" value={form.comment}
          onChange={(e) => onChange({ ...form, comment: e.target.value })} />
      </FormField>
    </FormLayout>
  );
}
