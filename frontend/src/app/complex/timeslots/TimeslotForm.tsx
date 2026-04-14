'use client';

import { useState } from 'react';
import FormField from '@/components/ui/FormField';
import FormLayout from '@/components/ui/FormLayout';
import FormErrorBanner from '@/components/ui/FormErrorBanner';
import { Input } from '@/components/ui/FormInput';
import TimePicker from '@/components/ui/TimePicker';
import ModalOverlay from '@/components/ui/ModalOverlay';

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
  form, onChange, onSubmit, isEdit, backHref, submitLabel, formError,
}: {
  form: TimeslotFormData;
  onChange: (form: TimeslotFormData) => void;
  onSubmit: () => void;
  isEdit?: boolean;
  backHref: string;
  submitLabel: string;
  formError?: string | null;
}) {
  const [timeAlert, setTimeAlert] = useState(false);
  const [timeAlertTarget, setTimeAlertTarget] = useState<'start' | 'end'>('end');

  const toggleDay = (day: string) => {
    const days = form.days.includes(day)
      ? form.days.filter(d => d !== day)
      : [...form.days, day];
    onChange({ ...form, days });
  };

  const handleStartTimeChange = (v: string) => {
    onChange({ ...form, startTime: v });
    if (form.endTime && v && v >= form.endTime) {
      setTimeAlertTarget('start');
      setTimeAlert(true);
    }
  };

  const handleEndTimeChange = (v: string) => {
    onChange({ ...form, endTime: v });
    if (form.startTime && v && v <= form.startTime) {
      setTimeAlertTarget('end');
      setTimeAlert(true);
    }
  };

  const handleTimeAlertConfirm = () => {
    setTimeAlert(false);
    if (timeAlertTarget === 'end') {
      onChange({ ...form, endTime: '' });
    } else {
      onChange({ ...form, startTime: '' });
    }
  };

  return (
    <>
      <FormLayout
        title={submitLabel === '등록' ? '수업 시간대 정보 추가' : '수업 시간대 정보 수정'}
        backHref={backHref} submitLabel={submitLabel}
        onSubmit={onSubmit} isEdit={isEdit}
        cardStyle={{ overflow: 'visible' }}
      >
        <FormErrorBanner error={formError ?? null} />
        <FormField label="시간대 이름" required>
          <Input placeholder="예: 평일 오전, 주말 오후" value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })} required />
        </FormField>

        <FormField label="요일" required>
          <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap', padding: 10, background: '#f9f9f9', borderRadius: 4 }}>
            {ALL_DAYS.map(day => (
              <label key={day} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.days.includes(day)} onChange={() => toggleDay(day)} />
                {day}
              </label>
            ))}
          </div>
        </FormField>

        <FormField label="시작 시간" required>
          <TimePicker value={form.startTime} onChange={handleStartTimeChange} placeholder="시작 시간 선택" />
        </FormField>

        <FormField label="종료 시간" required>
          <TimePicker value={form.endTime} onChange={handleEndTimeChange} placeholder="종료 시간 선택" />
        </FormField>
      </FormLayout>

      {timeAlert && (
        <ModalOverlay>
          <div style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            <p style={{ margin: '0 0 1.5rem', color: '#333', fontSize: '0.95rem', lineHeight: 1.6 }}>
              {timeAlertTarget === 'end'
                ? '종료 시간이 시작 시간보다 빠릅니다.\n종료 시간을 확인해 주세요.'
                : '시작 시간이 종료 시간보다 늦습니다.\n시작 시간을 확인해 주세요.'
              }
            </p>
            <button onClick={handleTimeAlertConfirm}
              style={{ padding: '0.6rem 2rem', border: 'none', borderRadius: 8,
                background: 'var(--primary)', color: 'white', fontSize: '0.95rem', cursor: 'pointer', fontWeight: 500 }}>
              확인
            </button>
          </div>
        </ModalOverlay>
      )}
    </>
  );
}
