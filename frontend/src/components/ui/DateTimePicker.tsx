'use client';

import DatePicker, { registerLocale } from 'react-datepicker';
import { ko } from 'date-fns/locale/ko';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('ko', ko);

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const pad = (n: number) => String(n).padStart(2, '0');

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function splitValue(value: string): { date: string; hour: string; minute: string } {
  if (!value) return { date: '', hour: '', minute: '' };
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const [d = '', t = ''] = normalized.split('T');
  const [h = '', m = ''] = t.split(':');
  return { date: d, hour: h, minute: m };
}

function parseDate(date: string): Date | null {
  if (!date) return null;
  const d = new Date(`${date}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(d: Date | null): string {
  if (!d) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function DateTimePicker({
  value,
  onChange,
  placeholder = '날짜 선택',
}: DateTimePickerProps) {
  const { date, hour, minute } = splitValue(value);

  const emit = (nDate: string, nHour: string, nMinute: string) => {
    if (!nDate) { onChange(''); return; }
    if (nHour && nMinute) { onChange(`${nDate}T${nHour}:${nMinute}`); return; }
    onChange(`${nDate}T`);
  };

  const fieldStyle: React.CSSProperties = {
    height: 34,
    padding: '0 0.5rem',
    border: '1px solid #ddd',
    borderRadius: 4,
    fontSize: '0.85rem',
    background: '#fff',
    color: '#333',
    boxSizing: 'border-box',
  };

  return (
    <div className="dtp-root" style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
      <DatePicker
        selected={parseDate(date)}
        onChange={(d) => emit(formatDate(d), hour, minute)}
        dateFormat="yyyy-MM-dd"
        locale="ko"
        placeholderText={placeholder}
        className="dtp-input"
      />
      <select
        value={hour}
        onChange={(e) => emit(date, e.target.value, minute || '00')}
        style={{ ...fieldStyle, width: 64 }}
      >
        <option value="">시</option>
        {HOURS.map(h => <option key={h} value={pad(h)}>{pad(h)}</option>)}
      </select>
      <span style={{ color: '#666' }}>:</span>
      <select
        value={minute}
        onChange={(e) => emit(date, hour || '00', e.target.value)}
        style={{ ...fieldStyle, width: 64 }}
      >
        <option value="">분</option>
        {MINUTES.map(m => <option key={m} value={pad(m)}>{pad(m)}</option>)}
      </select>
      <style jsx global>{`
        .dtp-root .react-datepicker-wrapper { width: 130px; }
        .dtp-root .dtp-input {
          width: 100%;
          height: 34px;
          padding: 0 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.85rem;
          background: #fff;
          color: #333;
          box-sizing: border-box;
          outline: none;
        }
        .dtp-root .dtp-input:focus { border-color: #4a90e2; }
      `}</style>
    </div>
  );
}
