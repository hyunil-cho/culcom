'use client';

import { useRef, useState, useEffect } from 'react';

interface TimePickerProps {
  value: string;          // "HH:mm"
  onChange: (value: string) => void;
  placeholder?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export default function TimePicker({ value, onChange, placeholder = '시간 선택' }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const hour = value ? parseInt(value.split(':')[0], 10) : null;
  const minute = value ? parseInt(value.split(':')[1], 10) : null;

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  // 열릴 때 선택된 항목으로 스크롤
  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      if (hourRef.current && hour !== null) {
        const el = hourRef.current.querySelector('[data-selected="true"]');
        el?.scrollIntoView({ block: 'center' });
      }
      if (minuteRef.current && minute !== null) {
        const el = minuteRef.current.querySelector('[data-selected="true"]');
        el?.scrollIntoView({ block: 'center' });
      }
    }, 0);
  }, [open, hour, minute]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectHour = (h: number) => {
    const m = minute ?? 0;
    onChange(`${pad(h)}:${pad(m)}`);
    if (minute !== null) setOpen(false);
  };

  const selectMinute = (m: number) => {
    const h = hour ?? 9;
    onChange(`${pad(h)}:${pad(m)}`);
    if (hour !== null) setOpen(false);
  };

  const displayValue = hour !== null && minute !== null
    ? `${pad(hour)}:${pad(minute)}`
    : '';

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <div
        className="form-input"
        onClick={() => setOpen(!open)}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
          color: displayValue ? 'var(--text)' : 'var(--text-secondary)',
        }}
      >
        <span>{displayValue || placeholder}</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>&#9662;</span>
      </div>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          zIndex: 100,
          marginTop: 4,
          background: 'var(--card-bg)',
          border: '2px solid var(--border)',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          display: 'flex',
          width: 220,
          overflow: 'hidden',
        }}>
          {/* 시 */}
          <div style={{ flex: 1, borderRight: '1px solid var(--border)' }}>
            <div style={{
              padding: '8px 0',
              textAlign: 'center',
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--text-secondary)',
              borderBottom: '1px solid var(--border)',
            }}>시</div>
            <div ref={hourRef} style={{ height: 200, overflowY: 'auto' }}>
              {HOURS.map(h => (
                <div
                  key={h}
                  data-selected={hour === h}
                  onClick={() => selectHour(h)}
                  style={{
                    padding: '8px 0',
                    textAlign: 'center',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: hour === h ? 600 : 400,
                    background: hour === h ? 'var(--primary)' : 'transparent',
                    color: hour === h ? '#fff' : 'var(--text)',
                    borderRadius: 0,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (hour !== h) (e.target as HTMLElement).style.background = '#f3f4f6'; }}
                  onMouseLeave={e => { if (hour !== h) (e.target as HTMLElement).style.background = 'transparent'; }}
                >
                  {pad(h)}
                </div>
              ))}
            </div>
          </div>

          {/* 분 */}
          <div style={{ flex: 1 }}>
            <div style={{
              padding: '8px 0',
              textAlign: 'center',
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--text-secondary)',
              borderBottom: '1px solid var(--border)',
            }}>분</div>
            <div ref={minuteRef} style={{ height: 200, overflowY: 'auto' }}>
              {MINUTES.map(m => (
                <div
                  key={m}
                  data-selected={minute === m}
                  onClick={() => selectMinute(m)}
                  style={{
                    padding: '8px 0',
                    textAlign: 'center',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: minute === m ? 600 : 400,
                    background: minute === m ? 'var(--primary)' : 'transparent',
                    color: minute === m ? '#fff' : 'var(--text)',
                    borderRadius: 0,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (minute !== m) (e.target as HTMLElement).style.background = '#f3f4f6'; }}
                  onMouseLeave={e => { if (minute !== m) (e.target as HTMLElement).style.background = 'transparent'; }}
                >
                  {pad(m)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
