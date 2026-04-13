'use client';

import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import type { ApiResponse } from '@/lib/api/client';

export function useApiMutation<TData = void, TVariables = void>(
  mutationFn: (vars: TVariables) => Promise<ApiResponse<TData>>,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>,
) {
  return useMutation<TData, Error, TVariables>({
    mutationFn: async (vars) => {
      const res = await mutationFn(vars);
      if (!res.success) throw new Error(res.message ?? 'API error');
      return res.data;
    },
    ...options,
  });
}
