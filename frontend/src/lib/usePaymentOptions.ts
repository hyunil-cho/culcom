'use client';

import { useEffect, useState } from 'react';
import { paymentMethodConfigApi, bankConfigApi } from '@/lib/api';

export interface OptionItem {
  value: string;
  label: string;
}

const PAYMENT_KINDS: OptionItem[] = [
  { value: 'DEPOSIT', label: '디포짓' },
  { value: 'BALANCE', label: '잔금' },
  { value: 'ADDITIONAL', label: '추가납부' },
  { value: 'REFUND', label: '환불정정' },
];

export interface PaymentOptions {
  methods: OptionItem[];
  banks: OptionItem[];
  kinds: OptionItem[];
}

let cache: { methods: OptionItem[]; banks: OptionItem[] } | null = null;
let inflight: Promise<{ methods: OptionItem[]; banks: OptionItem[] }> | null = null;

const EMPTY: PaymentOptions = { methods: [], banks: [], kinds: PAYMENT_KINDS };

export function usePaymentOptions(): PaymentOptions {
  const [options, setOptions] = useState<PaymentOptions>(
    cache ? { ...cache, kinds: PAYMENT_KINDS } : EMPTY,
  );

  useEffect(() => {
    if (cache) return;
    if (!inflight) {
      inflight = Promise.all([
        paymentMethodConfigApi.list(),
        bankConfigApi.list(),
      ]).then(([mRes, bRes]) => {
        const result = {
          methods: (mRes.data ?? []).filter(i => i.isActive).map(i => ({ value: i.code, label: i.code })),
          banks: (bRes.data ?? []).filter(i => i.isActive).map(i => ({ value: i.code, label: i.code })),
        };
        cache = result;
        return result;
      });
    }
    inflight.then(c => setOptions({ ...c, kinds: PAYMENT_KINDS }));
  }, []);

  return options;
}
