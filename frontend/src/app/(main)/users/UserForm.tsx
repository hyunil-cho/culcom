'use client';

import FormField from '@/components/ui/FormField';
import FormLayout from '@/components/ui/FormLayout';
import FormErrorBanner from '@/components/ui/FormErrorBanner';
import { Input, PhoneInput, PasswordInput, Checkbox } from '@/components/ui/FormInput';
import type { Branch } from '@/lib/api';

export interface UserFormData {
  userId: string;
  password: string;
  name: string;
  phone: string;
  branchSeqs: number[];
}

export const emptyUserForm: UserFormData = {
  userId: '',
  password: '',
  name: '',
  phone: '',
  branchSeqs: [],
};

export function validateUserForm(
  form: UserFormData,
  isEdit: boolean,
  opts?: { requireBranches?: boolean },
): string | null {
  if (!form.userId.trim()) return '아이디를 입력하세요.';
  if (!isEdit && !form.password.trim()) return '비밀번호를 입력하세요.';
  if (!form.name.trim()) return '이름을 입력하세요.';
  if (opts?.requireBranches && form.branchSeqs.length === 0) {
    return '담당 지점을 하나 이상 선택하세요.';
  }
  return null;
}

export default function UserForm({
  form, onChange, onSubmit, isEdit, backHref, submitLabel, formError,
  showBranchSelector, branches,
}: {
  form: UserFormData;
  onChange: (form: UserFormData) => void;
  onSubmit: () => void;
  isEdit?: boolean;
  backHref: string;
  submitLabel: string;
  formError?: string | null;
  showBranchSelector?: boolean;
  branches?: Branch[];
}) {
  const toggleBranch = (seq: number) => {
    const has = form.branchSeqs.includes(seq);
    onChange({
      ...form,
      branchSeqs: has ? form.branchSeqs.filter((s) => s !== seq) : [...form.branchSeqs, seq],
    });
  };

  return (
    <FormLayout
      title={isEdit ? '사용자 정보 수정' : '사용자 등록'}
      backHref={backHref} submitLabel={submitLabel}
      onSubmit={onSubmit} isEdit={isEdit}
    >
      <FormErrorBanner error={formError ?? null} />
      <FormField label="아이디" required>
        <Input placeholder="아이디" value={form.userId}
          onChange={(e) => onChange({ ...form, userId: e.target.value })}
          disabled={isEdit} required />
      </FormField>
      <FormField label="비밀번호" required={!isEdit} hint={isEdit ? '변경 시에만 입력하세요. 변경 시 대상은 최초 로그인처럼 재변경이 강제됩니다.' : undefined}>
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
      {showBranchSelector && (
        <FormField
          label="담당 지점"
          required
          hint="직원이 관리할 수 있는 지점을 선택하세요. (복수 선택 가능)"
        >
          {(branches?.length ?? 0) === 0 ? (
            <div className="branch-empty">선택할 수 있는 지점이 없습니다.</div>
          ) : (
            <div className="branch-checklist">
              {branches!.map((b) => (
                <Checkbox
                  key={b.seq}
                  label={b.branchName}
                  checked={form.branchSeqs.includes(b.seq)}
                  onChange={() => toggleBranch(b.seq)}
                />
              ))}
            </div>
          )}
        </FormField>
      )}
    </FormLayout>
  );
}
