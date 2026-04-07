'use client';

import { useEffect, useState } from 'react';
import { paymentOptionsApi, type PaymentOptions } from '@/lib/api';

let cache: PaymentOptions | null = null;
let inflight: Promise<PaymentOptions> | null = null;

const EMPTY: PaymentOptions = { methods: [], banks: [], kinds: [] };

export function usePaymentOptions(): PaymentOptions {
  const [options, setOptions] = useState<PaymentOptions>(cache ?? EMPTY);

  useEffect(() => {
    if (cache) return;
    if (!inflight) {
      inflight = paymentOptionsApi.get().then(res => {
        cache = res.data;
        return res.data;
      });
    }
    inflight.then(setOptions);
  }, []);

  return options;
}
