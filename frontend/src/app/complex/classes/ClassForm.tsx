'use client';

import FormField from '@/components/ui/FormField';
import FormLayout from '@/components/ui/FormLayout';
import { Input, NumberInput, Select, Textarea } from '@/components/ui/FormInput';
import { type ClassTimeSlot, type ComplexStaff } from '@/lib/api';

export interface ClassFormData {
  name: string;
  timeSlotSeq: number | '';
  staffSeq: number | '';
  capacity: number;
  description: string;
  sortOrder: number;
}

export const emptyClassForm: ClassFormData = {
  name: '',
  timeSlotSeq: '',
  staffSeq: '',
  capacity: 10,
  description: '',
  sortOrder: 0,
};

export function validateClassForm(form: ClassFormData): string | null {
  if (!form.name.trim()) return '수업 이름을 입력하세요.';
  if (!form.timeSlotSeq) return '시간대를 선택하세요.';
  if (form.capacity < 1) return '정원은 1명 이상이어야 합니다.';
  return null;
}

export default function ClassForm({
  form, onChange, onSubmit, isEdit, backHref, submitLabel, timeSlots, staffs,
}: {
  form: ClassFormData;
  onChange: (form: ClassFormData) => void;
  onSubmit: () => void;
  isEdit?: boolean;
  backHref: string;
  submitLabel: string;
  timeSlots: ClassTimeSlot[];
  staffs: ComplexStaff[];
}) {
  return (
    <FormLayout
      title={submitLabel === '등록' ? '새 수업 등록' : '수업 정보 수정'}
      backHref={backHref} submitLabel={submitLabel}
      onSubmit={onSubmit} isEdit={isEdit}
    >
      <FormField label="수업 이름" required>
        <Input placeholder="예: 월수 오전 레벨0" value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })} required />
      </FormField>

      <FormField label="수업 시간대 선택" required hint="원하는 시간대가 없으면 '시간대 설정'에서 먼저 등록해주세요.">
        <Select value={form.timeSlotSeq}
          onChange={(e) => onChange({ ...form, timeSlotSeq: e.target.value ? Number(e.target.value) : '' })} required>
          <option value="">-- 시간대 슬롯 선택 --</option>
          {timeSlots.map(ts => (
            <option key={ts.seq} value={ts.seq}>
              [{ts.name}] {ts.daysOfWeek} ({ts.startTime} ~ {ts.endTime})
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="담당 강사">
        <Select value={form.staffSeq}
          onChange={(e) => onChange({ ...form, staffSeq: e.target.value ? Number(e.target.value) : '' })}>
          <option value="">-- 강사 선택 (선택 사항) --</option>
          {staffs.map(s => <option key={s.seq} value={s.seq}>{s.name}</option>)}
        </Select>
      </FormField>

      <FormField label="수업 정원 (인원 수)" required hint="해당 수업에 동시에 참여 가능한 최대 인원 수를 입력하세요.">
        <NumberInput placeholder="예: 10" value={form.capacity}
          onChange={(e) => onChange({ ...form, capacity: Number(e.target.value) })} min={1} required />
      </FormField>

      <FormField label="수업 설명">
        <Textarea style={{ height: 100 }} placeholder="수업에 대한 상세 설명을 입력하세요."
          value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })} />
      </FormField>

      <FormField label="정렬 순서">
        <NumberInput value={form.sortOrder}
          onChange={(e) => onChange({ ...form, sortOrder: Number(e.target.value) })} />
      </FormField>
    </FormLayout>
  );
}
