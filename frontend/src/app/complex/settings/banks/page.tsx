'use client';

import { bankConfigApi } from '@/lib/api';
import ConfigCatalogPage from '../ConfigCatalogPage';

export default function BanksSettingsPage() {
  return (
    <ConfigCatalogPage
      title="환급 은행 관리"
      description="스태프 환급 정보 입력 시 선택할 수 있는 은행 목록을 관리합니다."
      api={bankConfigApi}
    />
  );
}
