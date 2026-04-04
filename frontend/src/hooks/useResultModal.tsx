'use client';

import { useState, ReactNode } from 'react';
import ResultModal from '@/components/ui/ResultModal';
import { ApiResponse } from '@/lib/api';

interface UseResultModalOptions {
  redirectPath?: string;
  onConfirm?: () => void | Promise<void>;
}

export function useResultModal(options?: UseResultModalOptions) {
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function run<T>(apiCall: Promise<ApiResponse<T>>, successMessage: string): Promise<ApiResponse<T>> {
    const res = await apiCall;
    if (res.success) {
      setResult({ success: true, message: successMessage });
    } else if (res.message) {
      setResult({ success: false, message: res.message });
    }
    return res;
  }

  const showError = (message: string) => {
    setResult({ success: false, message });
  };

  const modal: ReactNode = result ? (
    <ResultModal
      success={result.success}
      message={result.message}
      {...(result.success && options?.redirectPath
        ? { redirectPath: options.redirectPath }
        : { onConfirm: () => {
            const wasSuccess = result.success;
            setResult(null);
            if (wasSuccess) options?.onConfirm?.();
          } })}
    />
  ) : null;

  return { run, showError, modal };
}
