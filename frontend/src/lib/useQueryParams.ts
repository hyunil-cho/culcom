'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';

/**
 * URL 쿼리 파라미터와 상태를 동기화하는 훅.
 * 상세 페이지에서 뒤로가기 시 검색어, 페이지, 필터 등이 복원됨.
 */
export function useQueryParams<T extends Record<string, string>>(defaults: T) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const params = useMemo(() => {
    const result = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const value = searchParams.get(key);
      if (value !== null) {
        result[key as keyof T] = value as T[keyof T];
      }
    }
    return result;
  }, [searchParams, defaults]);

  const setParams = useCallback((updates: Partial<T>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === null || value === '' || value === defaults[key]) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router, defaults]);

  return { params, setParams };
}
