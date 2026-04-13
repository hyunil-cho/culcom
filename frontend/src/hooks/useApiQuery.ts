'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { ApiResponse } from '@/lib/api/client';

export function useApiQuery<T>(
  queryKey: unknown[],
  queryFn: () => Promise<ApiResponse<T>>,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<T, Error>({
    queryKey,
    queryFn: async () => {
      const res = await queryFn();
      if (!res.success) throw new Error(res.message ?? 'API error');
      return res.data;
    },
    ...options,
  });
}
