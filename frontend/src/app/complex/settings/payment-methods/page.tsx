'use client';

import { paymentMethodConfigApi } from '@/lib/api';
import ConfigCatalogPage from '../ConfigCatalogPage';

export default function PaymentMethodsSettingsPage() {
  return (
    <ConfigCatalogPage
      title="결제 방법 관리"
      description="회원 결제 시 선택할 수 있는 결제 수단을 관리합니다. 비활성화하면 새 결제 입력 화면에서 더 이상 노출되지 않습니다."
      api={paymentMethodConfigApi}
    />
  );
}
