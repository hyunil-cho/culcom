'use client';

import FormField from '@/components/ui/FormField';
import FormLayout from '@/components/ui/FormLayout';
import FormErrorBanner from '@/components/ui/FormErrorBanner';
import { Input, NumberInput, Select, CurrencyInput, Checkbox } from '@/components/ui/FormInput';

export interface MembershipFormData {
  name: string;
  durationValue: number;
  durationUnit: 'day' | 'month' | 'year';
  count: number;
  price: number;
  transferable: boolean;
}

export const emptyMembershipForm: MembershipFormData = {
  name: '',
  durationValue: 1,
  durationUnit: 'month',
  count: 1,
  price: 0,
  transferable: true,
};

export function toDurationDays(form: MembershipFormData): number {
  switch (form.durationUnit) {
    case 'year': return form.durationValue * 365;
    case 'month': return form.durationValue * 30;
    default: return form.durationValue;
  }
}

export function fromDurationDays(days: number): { value: number; unit: 'day' | 'month' | 'year' } {
  if (days > 0 && days % 365 === 0) return { value: days / 365, unit: 'year' };
  if (days > 0 && days % 30 === 0) return { value: days / 30, unit: 'month' };
  return { value: days, unit: 'day' };
}

export function validateMembershipForm(form: MembershipFormData): string | null {
  if (!form.name.trim()) return '멤버십 이름을 입력하세요.';
  if (form.durationValue <= 0) return '유효 기간을 입력하세요.';
  if (form.count <= 0) return '수강 횟수를 입력하세요.';
  if (form.price < 0) return '판매 가격을 입력하세요.';
  return null;
}

export default function MembershipForm({
  form, onChange, onSubmit, isEdit, backHref, submitLabel, formError,
}: {
  form: MembershipFormData;
  onChange: (form: MembershipFormData) => void;
  onSubmit: () => void;
  isEdit?: boolean;
  backHref: string;
  submitLabel: string;
  formError?: string | null;
}) {
  const set = <K extends keyof MembershipFormData>(field: K, value: MembershipFormData[K]) =>
    onChange({ ...form, [field]: value });

  return (
    <FormLayout
      title={submitLabel === '등록' ? '신규 멤버십 등록' : '멤버십 정보 수정'}
      backHref={backHref} submitLabel={submitLabel}
      onSubmit={onSubmit} isEdit={isEdit}
    >
      <FormErrorBanner error={formError ?? null} />
      <FormField label="멤버십 이름" required>
        <Input placeholder="예: 3개월 주2회 멤버십" value={form.name}
          onChange={(e) => set('name', e.target.value)} required />
      </FormField>

      <FormField label="유효 기간" required hint="멤버십이 유지되는 기간을 선택하세요.">
        <div style={{ display: 'flex', gap: 10 }}>
          <NumberInput style={{ flex: 2 }} value={form.durationValue}
            onChange={(e) => set('durationValue', Number(e.target.value))} min={1} required />
          <Select style={{ flex: 1 }} value={form.durationUnit}
            onChange={(e) => set('durationUnit', e.target.value as MembershipFormData['durationUnit'])}>
            <option value="day">일</option>
            <option value="month">개월</option>
            <option value="year">년</option>
          </Select>
        </div>
      </FormField>

      <FormField label="수강 횟수 (회)" required hint="해당 기간 동안 수강 가능한 총 횟수를 입력하세요.">
        <NumberInput placeholder="예: 24" value={form.count}
          onChange={(e) => set('count', Number(e.target.value))} min={1} required />
      </FormField>

      <FormField label="판매 가격 (원)" required hint="부가세 포함 판매가를 입력하세요.">
        <CurrencyInput placeholder="예: 450,000" value={form.price}
          onValueChange={(v) => set('price', Number(v) || 0)} required />
      </FormField>

      <FormField label="양도 설정">
        <Checkbox label="양도 가능" hint="체크 해제 시 이 멤버십은 다른 회원에게 양도할 수 없습니다."
          checked={form.transferable}
          onChange={(e) => set('transferable', e.target.checked)} />
      </FormField>
    </FormLayout>
  );
}
