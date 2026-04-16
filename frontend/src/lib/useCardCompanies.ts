'use client';

import { useApiQuery } from '@/hooks/useApiQuery';
import { cardCompanyConfigApi, type ConfigItem } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

export function useCardCompanies(): { cardCompanies: ConfigItem[]; loading: boolean } {
  const { data, isLoading } = useApiQuery<ConfigItem[]>(
    ['config', 'cardCompanies'],
    () => cardCompanyConfigApi.list(),
  );
  return { cardCompanies: data ?? [], loading: isLoading };
}

export function invalidateCardCompanyCache() {
  queryClient.invalidateQueries({ queryKey: ['config', 'cardCompanies'] });
}
