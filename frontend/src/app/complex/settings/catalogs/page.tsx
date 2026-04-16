'use client';

import { useState } from 'react';
import { paymentMethodConfigApi, bankConfigApi, signupChannelConfigApi, cardCompanyConfigApi } from '@/lib/api';
import ConfigCatalogPage from '../ConfigCatalogPage';

type TabId = 'payment-methods' | 'banks' | 'signup-channels' | 'card-companies';

const TABS: { id: TabId; label: string; title: string; description: string; api: typeof paymentMethodConfigApi }[] = [
  {
    id: 'payment-methods',
    label: '결제 방법',
    title: '결제 방법 관리',
    description: '회원 결제 시 선택할 수 있는 결제 수단을 관리합니다. 비활성화하면 새 결제 입력 화면에서 더 이상 노출되지 않습니다.',
    api: paymentMethodConfigApi,
  },
  {
    id: 'banks',
    label: '환급 은행',
    title: '환급 은행 관리',
    description: '스태프 환급 정보 입력 시 선택할 수 있는 은행 목록을 관리합니다.',
    api: bankConfigApi,
  },
  {
    id: 'signup-channels',
    label: '가입 경로',
    title: '가입 경로 관리',
    description: '회원 등록 시 선택할 수 있는 가입 경로 목록을 관리합니다.',
    api: signupChannelConfigApi,
  },
  {
    id: 'card-companies',
    label: '카드사',
    title: '카드사 관리',
    description: '카드 결제 입력 시 선택할 수 있는 카드사 목록을 관리합니다.',
    api: cardCompanyConfigApi,
  },
];

const TAB_STYLE = {
  base: {
    padding: '10px 20px', border: 'none', borderBottom: '3px solid transparent',
    background: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600,
    color: '#999', transition: 'all 0.2s',
  } as React.CSSProperties,
  active: {
    color: '#4a90e2', borderBottomColor: '#4a90e2',
  } as React.CSSProperties,
};

export default function CatalogsSettingsPage() {
  const [active, setActive] = useState<TabId>('payment-methods');
  const current = TABS.find(t => t.id === active)!;

  return (
    <>
      <h2 className="page-title">옵션 카탈로그 관리</h2>
      <div style={{ display: 'flex', borderBottom: '2px solid #e9ecef', marginBottom: '1.5rem' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            style={{ ...TAB_STYLE.base, ...(active === tab.id ? TAB_STYLE.active : {}) }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <ConfigCatalogPage
        key={current.id}
        title={current.title}
        description={current.description}
        api={current.api}
        showHeader={false}
      />
    </>
  );
}
