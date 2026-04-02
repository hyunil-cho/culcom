'use client';

import { useEffect, useState } from 'react';
import { integrationApi, IntegrationService } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/routes';

const categories = [
  { key: 'all', label: '전체' },
  { key: 'SMS', label: '💬 SMS' },
  { key: 'EMAIL', label: '📧 이메일' },
  { key: 'STORAGE', label: '☁️ 스토리지' },
  { key: 'PAYMENT', label: '💳 결제' },
];

export default function IntegrationsPage() {
  const router = useRouter();
  const [services, setServices] = useState<IntegrationService[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = () => {
    setLoading(true);
    integrationApi.list().then((res) => {
      if (res.success) setServices(res.data ?? []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all'
    ? services
    : services.filter((s) => s.category === filter);

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active': return { text: '연동 중', bg: '#e8f5e9', color: '#2e7d32' };
      case 'inactive': return { text: '비활성', bg: '#fff3e0', color: '#e65100' };
      default: return { text: '미설정', bg: '#f5f5f5', color: '#616161' };
    }
  };

  const borderColor = (status: string) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'inactive': return '#ff9800';
      default: return '#9e9e9e';
    }
  };

  return (
    <>
      <div style={{ marginBottom: 8 }}>
        <h2 className="page-title" style={{ margin: 0 }}>외부 시스템 연동 관리</h2>
      </div>

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            style={{
              padding: '8px 16px',
              border: `1px solid ${filter === c.key ? '#2196f3' : '#e0e0e0'}`,
              background: filter === c.key ? '#2196f3' : 'white',
              color: filter === c.key ? 'white' : '#666',
              borderRadius: 20, cursor: 'pointer', fontSize: 14,
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>로딩 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>등록된 연동 서비스가 없습니다.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 20 }}>
          {filtered.map((svc) => {
            const sl = statusLabel(svc.status);
            return (
              <div key={svc.id} className="card" style={{ borderLeft: `4px solid ${borderColor(svc.status)}`, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 32 }}>{svc.icon}</div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18 }}>{svc.name}</h3>
                    <span style={{
                      display: 'inline-block', padding: '4px 12px', borderRadius: 12,
                      fontSize: 12, fontWeight: 500, marginTop: 4,
                      background: sl.bg, color: sl.color,
                    }}>
                      {sl.text}
                    </span>
                  </div>
                </div>

                <span style={{
                  display: 'inline-block', padding: '4px 10px',
                  background: '#f5f5f5', borderRadius: 4, fontSize: 12, color: '#666', marginBottom: 12,
                }}>
                  {svc.category}
                </span>

                <p style={{ color: '#666', fontSize: 14, lineHeight: 1.5, margin: '12px 0' }}>
                  {svc.description}
                </p>

                {svc.category === 'SMS' && (
                  <div style={{ marginTop: 16 }}>
                    <button
                      onClick={() => router.push(ROUTES.INTEGRATIONS_SMS_CONFIG)}
                      style={{
                        width: '100%', padding: '8px 16px', borderRadius: 6, fontSize: 14,
                        background: '#2196f3', color: 'white', border: 'none', cursor: 'pointer',
                      }}
                    >
                      {svc.status === 'active' ? '관리' : '설정'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </>
  );
}
