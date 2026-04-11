'use client';

import { useEffect, useState } from 'react';
import { signupChannelConfigApi, type ConfigItem } from '@/lib/api';

let cache: ConfigItem[] | null = null;
let inflight: Promise<ConfigItem[]> | null = null;

export function useSignupChannels(): { channels: ConfigItem[]; loading: boolean } {
  const [channels, setChannels] = useState<ConfigItem[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    if (!inflight) {
      inflight = signupChannelConfigApi.list().then(res => {
        cache = res.data;
        return res.data;
      });
    }
    inflight.then(data => {
      setChannels(data);
      setLoading(false);
    });
  }, []);

  return { channels, loading };
}

/** 캐시를 무효화한다. 설정 변경 후 호출. */
export function invalidateSignupChannelCache() {
  cache = null;
  inflight = null;
}