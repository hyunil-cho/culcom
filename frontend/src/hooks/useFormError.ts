'use client';

import { useState, useCallback } from 'react';

export function useFormError() {
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback((errorMessage: string | null): boolean => {
    setError(errorMessage);
    return !errorMessage;
  }, []);

  const clear = useCallback(() => setError(null), []);

  return { error, setError, validate, clear };
}
