import { useState, useCallback } from 'react';

export interface UseModalReturn<T> {
  data: T | null;
  isOpen: boolean;
  open: (data: T) => void;
  close: () => void;
}

export function useModal<T = true>(): UseModalReturn<T> {
  const [data, setData] = useState<T | null>(null);

  const open = useCallback((value: T) => setData(value), []);
  const close = useCallback(() => setData(null), []);

  return { data, isOpen: data !== null, open, close };
}
