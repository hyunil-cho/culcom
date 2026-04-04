'use client';

import { forwardRef, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`form-input ${props.className ?? ''}`} />;
}

/** 전화번호 입력 (type="tel", maxLength=11) */
export function PhoneInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return <Input type="tel" maxLength={11} placeholder="01012345678" {...props} />;
}

/** 숫자 입력 (type="number") */
export function NumberInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return <Input type="number" {...props} />;
}

/** 이메일 입력 (type="email") */
export function EmailInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return <Input type="email" placeholder="email@example.com" {...props} />;
}

/** 비밀번호 입력 (type="password") */
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return <Input type="password" {...props} />;
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`form-input ${props.className ?? ''}`}>{children}</select>;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  (props, ref) => <textarea ref={ref} {...props} className={`form-input ${props.className ?? ''}`} />
);
Textarea.displayName = 'Textarea';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hint?: string;
}

export function Checkbox({ label, hint, ...props }: CheckboxProps) {
  return (
    <div>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input
          type="checkbox"
          {...props}
          style={{ width: 18, height: 18, margin: 0, ...props.style }}
        />
        <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
      </label>
      {hint && (
        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{hint}</div>
      )}
    </div>
  );
}
