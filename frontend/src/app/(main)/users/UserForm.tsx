'use client';

import FormField from '@/components/ui/FormField';
import FormLayout from '@/components/ui/FormLayout';
import { Input, PhoneInput, PasswordInput } from '@/components/ui/FormInput';

export interface UserFormData {
  userId: string;
  password: string;
  name: string;
  phone: string;
}

export const emptyUserForm: UserFormData = {
  userId: '',
  password: '',
  name: '',
  phone: '',
};

export function validateUserForm(form: UserFormData, isEdit: boolean): string | null {
  if (!form.userId.trim()) return '아이디를 입력하세요.';
  if (!isEdit && !form.password.trim()) return '비밀번호를 입력하세요.';
  if (!form.name.trim()) return '이름을 입력하세요.';
  return null;
}

export default function UserForm({
  form, onChange, onSubmit, isEdit, backHref, submitLabel,
}: {
  form: UserFormData;
  onChange: (form: UserFormData) => void;
  onSubmit: () => void;
  isEdit?: boolean;
  backHref: string;
  submitLabel: string;
}) {
  return (
    <FormLayout
      title={isEdit ? '사용자 정보 수정' : '사용자 등록'}
      backHref={backHref} submitLabel={submitLabel}
      onSubmit={onSubmit} isEdit={isEdit}
    >
      <FormField label="아이디" required>
        <Input placeholder="아이디" value={form.userId}
          onChange={(e) => onChange({ ...form, userId: e.target.value })}
          disabled={isEdit} required />
      </FormField>
      <FormField label="비밀번호" required={!isEdit} hint={isEdit ? '변경 시에만 입력하세요.' : undefined}>
        <PasswordInput placeholder={isEdit ? '변경할 비밀번호' : '비밀번호'}
          value={form.password}
          onChange={(e) => onChange({ ...form, password: e.target.value })}
          required={!isEdit} />
      </FormField>
      <FormField label="이름" required>
        <Input placeholder="이름" value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })} required />
      </FormField>
      <FormField label="전화번호">
        <PhoneInput value={form.phone}
          onChange={(e) => onChange({ ...form, phone: e.target.value })} />
      </FormField>
    </FormLayout>
  );
}
