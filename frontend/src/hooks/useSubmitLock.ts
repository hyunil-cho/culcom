'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * 제출/수정 버튼의 더블-서브밋을 막기 위한 공통 훅.
 *
 * useState 만으로는 동기적 연속 클릭(리렌더 전) 사이에 재진입을 막을 수 없다.
 * useRef 로 동기 잠금을 걸고, submitting 상태로 UI(disabled/라벨)를 제어한다.
 */
export function useSubmitLock() {
  const pendingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const run = useCallback(async <T>(fn: () => Promise<T> | T): Promise<T | undefined> => {
    if (pendingRef.current) return undefined;
    pendingRef.current = true;
    setSubmitting(true);
    try {
      return await fn();
    } finally {
      pendingRef.current = false;
      setSubmitting(false);
    }
  }, []);

  return { submitting, run };
}
