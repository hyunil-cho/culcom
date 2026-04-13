'use client';

import { useApiQuery } from '@/hooks/useApiQuery';
import { signupChannelConfigApi, type ConfigItem } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

export function useSignupChannels(): { channels: ConfigItem[]; loading: boolean } {
  const { data, isLoading } = useApiQuery<ConfigItem[]>(
    ['config', 'signupChannels'],
    () => signupChannelConfigApi.list(),
  );
  return { channels: data ?? [], loading: isLoading };
}

/** 캐시를 무효화한다. 설정 변경 후 호출. */
export function invalidateSignupChannelCache() {
  queryClient.invalidateQueries({ queryKey: ['config', 'signupChannels'] });
}
