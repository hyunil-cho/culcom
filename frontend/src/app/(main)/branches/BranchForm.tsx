'use client';

import FormField from '@/components/ui/FormField';
import FormLayout from '@/components/ui/FormLayout';
import FormErrorBanner from '@/components/ui/FormErrorBanner';
import { Input, Textarea } from '@/components/ui/FormInput';

export interface BranchFormData {
  branchName: string;
  alias: string;
  branchManager: string;
  address: string;
  directions: string;
}

export const emptyBranchForm: BranchFormData = {
  branchName: '',
  alias: '',
  branchManager: '',
  address: '',
  directions: '',
};

export function validateBranchForm(form: BranchFormData): string | null {
  if (!form.branchName.trim()) return '지점명을 입력해주세요.';
  if (!form.alias.trim()) return '별칭을 입력해주세요.';
  if (!/^[a-zA-Z]+$/.test(form.alias)) return '별칭은 영문만 입력 가능합니다.';
  return null;
}

export default function BranchForm({
  form, onChange, onSubmit, backHref, backLabel, seq, formError,
}: {
  form: BranchFormData;
  onChange: (form: BranchFormData) => void;
  onSubmit: () => void;
  backHref: string;
  backLabel: string;
  seq?: number;
  formError?: string | null;
}) {
  const set = (field: keyof BranchFormData, value: string) =>
    onChange({ ...form, [field]: value });

  return (
    <FormLayout title="기본 정보" backHref={backHref} backLabel={backLabel}
      submitLabel="저장" onSubmit={onSubmit}>
      <FormErrorBanner error={formError ?? null} />
      {seq !== undefined && (
        <FormField label="지점코드">
          <Input value={seq} disabled />
        </FormField>
      )}
      <FormField label="지점명" required>
        <Input placeholder="지점명을 입력하세요" value={form.branchName}
          onChange={(e) => set('branchName', e.target.value)} required />
      </FormField>
      <FormField label="별칭" required hint="영문만 입력 가능합니다 (예: gangnam, hongdae)">
        <Input placeholder="영문 별칭을 입력하세요" value={form.alias}
          onChange={(e) => set('alias', e.target.value)} required />
      </FormField>
      <FormField label="매니저">
        <Input placeholder="담당자를 입력하세요" value={form.branchManager}
          onChange={(e) => set('branchManager', e.target.value)} />
      </FormField>
      <FormField label="주소">
        <Input placeholder="주소를 입력하세요" value={form.address}
          onChange={(e) => set('address', e.target.value)} />
      </FormField>
      <FormField label="오시는 길">
        <Textarea rows={4} placeholder="오시는 길 안내를 입력하세요" value={form.directions}
          onChange={(e) => set('directions', e.target.value)} />
      </FormField>
    </FormLayout>
  );
}
