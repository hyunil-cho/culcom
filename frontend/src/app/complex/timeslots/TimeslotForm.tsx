'use client';

import Link from 'next/link';
import FormField from '@/components/ui/FormField';

const ALL_DAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;

export interface TimeslotFormData {
  name: string;
  days: string[];
  startTime: string;
  endTime: string;
}

export const emptyTimeslotForm: TimeslotFormData = {
  name: '',
  days: [],
  startTime: '',
  endTime: '',
};

export function validateTimeslotForm(form: TimeslotFormData): string | null {
  if (!form.name.trim()) return '시간대 이름을 입력하세요.';
  if (form.days.length === 0) return '요일을 선택하세요.';
  if (!form.startTime) return '시작 시간을 입력하세요.';
  if (!form.endTime) return '종료 시간을 입력하세요.';
  return null;
}

export function toDaysOfWeek(days: string[]): string {
  return days.join(',');
}

export function fromDaysOfWeek(daysOfWeek: string): string[] {
  return daysOfWeek ? daysOfWeek.split(',').map(d => d.trim()) : [];
}

export default function TimeslotForm({
  form,
  onChange,
  onSubmit,
  backHref,
  submitLabel,
}: {
  form: TimeslotFormData;
  onChange: (form: TimeslotFormData) => void;
  onSubmit: () => void;
  backHref: string;
  submitLabel: string;
}) {
  const toggleDay = (day: string) => {
    const days = form.days.includes(day)
      ? form.days.filter(d => d !== day)
      : [...form.days, day];
    onChange({ ...form, days });
  };

  return (
    <>
      <div className="detail-actions">
        <Link href={backHref} className="btn-back">← 목록으로</Link>
      </div>

      <div className="content-card">
        <div className="form-header">
          <h2>{submitLabel === '등록' ? '수업 시간대 정보 추가' : '수업 시간대 정보 수정'}</h2>
        </div>
        <div className="form-body">
          <FormField label="시간대 이름" required>
            <input
              className="form-input"
              placeholder="예: 평일 오전, 주말 오후"
              value={form.name}
              onChange={(e) => onChange({ ...form, name: e.target.value })}
              required
            />
          </FormField>

          <FormField label="요일" required>
            <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap', padding: 10, background: '#f9f9f9', borderRadius: 4 }}>
              {ALL_DAYS.map(day => (
                <label key={day} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.days.includes(day)}
                    onChange={() => toggleDay(day)}
                  />
                  {day}
                </label>
              ))}
            </div>
          </FormField>

          <FormField label="시작 시간" required>
            <input
              type="time"
              className="form-input"
              value={form.startTime}
              onChange={(e) => onChange({ ...form, startTime: e.target.value })}
              required
            />
          </FormField>

          <FormField label="종료 시간" required>
            <input
              type="time"
              className="form-input"
              value={form.endTime}
              onChange={(e) => onChange({ ...form, endTime: e.target.value })}
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
