'use client';

import Link from 'next/link';
import { ROUTES } from '@/lib/routes';

const settingsItems = [
  {
    href: ROUTES.SETTINGS_RESERVATION_SMS,
    title: '예약 확정 시 문자 발송',
    description: '예약 확정 시 자동으로 발송되는 문자 메시지의 템플릿과 발신번호를 설정합니다.',
  },
];

export default function SettingsPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#333', marginBottom: 8 }}>설정</h1>
        <p style={{ fontSize: 14, color: '#666' }}>백오피스의 다양한 설정을 관리합니다</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {settingsItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'block',
              background: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: 12,
              padding: 24,
              textDecoration: 'none',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 600, color: '#333', marginBottom: 8 }}>
              {item.title}
            </div>
            <div style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>
              {item.description}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}