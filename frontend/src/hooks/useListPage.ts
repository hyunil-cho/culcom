'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ApiResponse, PageResponse } from '@/lib/api/client';

interface UseListPageOptions {
  size?: number;
  /** false로 설정하면 마운트 시 자동 로드하지 않음 (기본: true) */
  autoLoad?: boolean;
}

interface UseListPageReturn<T> {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  totalElements: number;
  /** load(page, extraParams?) — page change 시 이전 extraParams 자동 유지 */
  load: (page?: number, extraParams?: Record<string, string>) => void;
  pagination: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export function useListPage<T>(
  apiFn: (query: string) => Promise<ApiResponse<PageResponse<T>>>,
  options?: UseListPageOptions,
): UseListPageReturn<T> {
  const size = options?.size ?? 20;
  const autoLoad = options?.autoLoad ?? true;

  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const apiFnRef = useRef(apiFn);
  apiFnRef.current = apiFn;
  const lastParamsRef = useRef<Record<string, string>>({});

  const load = useCallback((targetPage = 0, extraParams?: Record<string, string>) => {
    if (extraParams !== undefined) lastParamsRef.current = extraParams;
    const ep = extraParams ?? lastParamsRef.current;

    const params = new URLSearchParams({ page: String(targetPage), size: String(size) });
    for (const [k, v] of Object.entries(ep)) {
      if (v) params.set(k, v);
    }
    setPage(targetPage);
    apiFnRef.current(params.toString()).then(res => {
      if (res.success) {
        setItems(res.data.content);
        setTotalPages(res.data.totalPages);
        if (res.data.totalElements != null) setTotalElements(res.data.totalElements);
      }
    });
  }, [size]);

  useEffect(() => {
    if (autoLoad) load();
  }, [autoLoad, load]);

  return {
    items,
    setItems,
    totalElements,
    load,
    pagination: {
      page,
      totalPages,
      onPageChange: (p: number) => load(p),
    },
  };
}
