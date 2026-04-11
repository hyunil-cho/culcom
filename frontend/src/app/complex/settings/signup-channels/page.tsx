'use client';

import { signupChannelConfigApi } from '@/lib/api';
import ConfigCatalogPage from '../ConfigCatalogPage';

export default function SignupChannelsSettingsPage() {
  return (
    <ConfigCatalogPage
      title="가입 경로 관리"
      description="회원 등록 시 선택할 수 있는 가입 경로 목록을 관리합니다."
      api={signupChannelConfigApi}
    />
  );
}
