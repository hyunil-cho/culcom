'use client';

import { useState, type ReactNode } from 'react';
import { useResultModal } from '@/hooks/useResultModal';
import type { ApiResponse } from '@/lib/api/client';

interface UseFormStateOptions {
  redirectPath?: string;
  onConfirm?: () => void | Promise<void>;
}

interface UseFormStateReturn<T> {
  form: T;
  setForm: React.Dispatch<React.SetStateAction<T>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  submitting: boolean;
  submit: (apiCall: Promise<ApiResponse<unknown>>, successMessage: string) => Promise<void>;
  showError: (message: string) => void;
  modal: ReactNode;
}

export function useFormState<T>(
  initial: T,
  options?: UseFormStateOptions,
): UseFormStateReturn<T> {
  const [form, setForm] = useState<T>(initial);
  const [submitting, setSubmitting] = useState(false);
  const { run, showError, modal } = useResultModal(options);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const submit = async (apiCall: Promise<ApiResponse<unknown>>, successMessage: string) => {
    setSubmitting(true);
    await run(apiCall, successMessage);
    setSubmitting(false);
  };

  return { form, setForm, handleChange, submitting, submit, showError, modal };
}
