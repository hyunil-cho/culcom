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
