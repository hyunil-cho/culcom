'use client';

import { useRef, useState, useEffect } from 'react';
import styles from './TimePicker.module.css';

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
    <div ref={ref} className={styles.wrapper}>
      <div
        className={`form-input ${styles.trigger}`}
        onClick={() => setOpen(!open)}
        style={{ color: displayValue ? 'var(--text)' : 'var(--text-secondary)' }}
      >
        <span>{displayValue || placeholder}</span>
        <span className={styles.triggerArrow}>&#9662;</span>
      </div>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.columnLeft}>
            <div className={styles.columnHeader}>시</div>
            <div ref={hourRef} className={styles.scrollArea}>
              {HOURS.map(h => (
                <div
                  key={h}
                  data-selected={hour === h}
                  onClick={() => selectHour(h)}
                  className={hour === h ? styles.optionSelected : styles.option}
                >
                  {pad(h)}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.column}>
            <div className={styles.columnHeader}>분</div>
            <div ref={minuteRef} className={styles.scrollArea}>
              {MINUTES.map(m => (
                <div
                  key={m}
                  data-selected={minute === m}
                  onClick={() => selectMinute(m)}
                  className={minute === m ? styles.optionSelected : styles.option}
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