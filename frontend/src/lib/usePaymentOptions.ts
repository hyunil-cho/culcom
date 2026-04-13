'use client';

import { useApiQuery } from '@/hooks/useApiQuery';
import { paymentMethodConfigApi, bankConfigApi, type ConfigItem } from '@/lib/api';

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

export function usePaymentOptions(): PaymentOptions {
  const { data: methods } = useApiQuery<ConfigItem[]>(
    ['config', 'paymentMethods'],
    () => paymentMethodConfigApi.list(),
  );
  const { data: banks } = useApiQuery<ConfigItem[]>(
    ['config', 'banks'],
    () => bankConfigApi.list(),
  );

  return {
    methods: (methods ?? []).filter(i => i.isActive).map(i => ({ value: i.code, label: i.code })),
    banks: (banks ?? []).filter(i => i.isActive).map(i => ({ value: i.code, label: i.code })),
    kinds: PAYMENT_KINDS,
  };
}
