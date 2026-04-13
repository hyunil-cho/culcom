'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ApiResponse, PageResponse } from '@/lib/api/client';

interface UseListPageQueryOptions {
  size?: number;
  autoLoad?: boolean;
}

interface UseListPageQueryReturn<T> {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  totalElements: number;
  load: (page?: number, extraParams?: Record<string, string>) => void;
  pagination: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export function useListPageQuery<T>(
  queryKey: string,
  apiFn: (query: string) => Promise<ApiResponse<PageResponse<T>>>,
  options?: UseListPageQueryOptions,
): UseListPageQueryReturn<T> {
  const size = options?.size ?? 20;
  const autoLoad = options?.autoLoad ?? true;

  const [page, setPage] = useState(0);
  const [extraParams, setExtraParams] = useState<Record<string, string>>({});
  const [itemsOverride, setItemsOverride] = useState<T[] | null>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    for (const [k, v] of Object.entries(extraParams)) {
      if (v) params.set(k, v);
    }
    return params.toString();
  }, [page, size, extraParams]);

  const { data } = useQuery<PageResponse<T>, Error>({
    queryKey: [queryKey, page, size, extraParams],
    queryFn: async () => {
      const res = await apiFn(buildQuery());
      if (!res.success) throw new Error(res.message ?? 'API error');
      return res.data;
    },
    enabled: autoLoad,
  });

  const items = itemsOverride ?? data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  const load = useCallback((targetPage?: number, newExtraParams?: Record<string, string>) => {
    setItemsOverride(null);
    if (targetPage !== undefined) setPage(targetPage);
    if (newExtraParams !== undefined) setExtraParams(newExtraParams);
  }, []);

  const setItems: React.Dispatch<React.SetStateAction<T[]>> = useCallback((action) => {
    setItemsOverride(prev => {
      const current = prev ?? data?.content ?? [];
      return typeof action === 'function' ? (action as (prev: T[]) => T[])(current) : action;
    });
  }, [data?.content]);

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
