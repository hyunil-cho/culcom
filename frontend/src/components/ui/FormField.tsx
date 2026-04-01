'use client';

import { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

export default function FormField({ label, required, hint, children }: FormFieldProps) {
  return (
    <div className="form-row">
      <label className="form-label">
        {label} {required && <span className="required">*</span>}
      </label>
      {children}
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  );
}
