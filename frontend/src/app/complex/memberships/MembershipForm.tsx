'use client';

import Link from 'next/link';
import FormField from '@/components/ui/FormField';

export interface MembershipFormData {
  name: string;
  durationValue: number;
  durationUnit: 'day' | 'month' | 'year';
  count: number;
  price: number;
}

export const emptyMembershipForm: MembershipFormData = {
  name: '',
  durationValue: 1,
  durationUnit: 'month',
  count: 1,
  price: 0,
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
  form,
  onChange,
  onSubmit,
  backHref,
  submitLabel,
}: {
  form: MembershipFormData;
  onChange: (form: MembershipFormData) => void;
  onSubmit: () => void;
  backHref: string;
  submitLabel: string;
}) {
  const set = <K extends keyof MembershipFormData>(field: K, value: MembershipFormData[K]) =>
    onChange({ ...form, [field]: value });

  return (
    <>
      <div className="detail-actions">
        <Link href={backHref} className="btn-back">← 목록으로</Link>
      </div>

      <div className="content-card">
        <div className="form-header">
          <h2>{submitLabel === '등록' ? '신규 멤버십 등록' : '멤버십 정보 수정'}</h2>
        </div>
        <div className="form-body">
          <FormField label="멤버십 이름" required>
            <input
              className="form-input"
              placeholder="예: 3개월 주2회 멤버십"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              required
            />
          </FormField>

          <FormField label="유효 기간" required hint="멤버십이 유지되는 기간을 선택하세요.">
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="number"
                className="form-input"
                style={{ flex: 2 }}
                value={form.durationValue}
                onChange={(e) => set('durationValue', Number(e.target.value))}
                min={1}
                required
              />
              <select
                className="form-input"
                style={{ flex: 1 }}
                value={form.durationUnit}
                onChange={(e) => set('durationUnit', e.target.value as MembershipFormData['durationUnit'])}
              >
                <option value="day">일</option>
                <option value="month">개월</option>
                <option value="year">년</option>
              </select>
            </div>
          </FormField>

          <FormField label="수강 횟수 (회)" required hint="해당 기간 동안 수강 가능한 총 횟수를 입력하세요.">
            <input
              type="number"
              className="form-input"
              placeholder="예: 24"
              value={form.count}
              onChange={(e) => set('count', Number(e.target.value))}
              min={1}
              required
            />
          </FormField>

          <FormField label="판매 가격 (원)" required hint="부가세 포함 판매가를 입력하세요.">
            <input
              type="number"
              className="form-input"
              placeholder="예: 450000"
              value={form.price}
              onChange={(e) => set('price', Number(e.target.value))}
              min={0}
              required
            />
          </FormField>
        </div>
      </div>

      <div className="form-actions">
        <button className="btn-primary-large" onClick={onSubmit}>{submitLabel}</button>
        <Link href={backHref} className="btn-secondary-large">취소</Link>
      </div>
    </>
  );
}
