'use client';

import { useEffect, useState } from 'react';
import { integrationApi, IntegrationService } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/routes';
import st from './page.module.css';

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

  useEffect(() => {
    setLoading(true);
    integrationApi.list().then((res) => { if (res.success) setServices(res.data ?? []); setLoading(false); });
  }, []);

  const filtered = filter === 'all' ? services : services.filter((s) => s.category === filter);

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active': return { text: '연동 중', bg: '#e8f5e9', color: '#2e7d32' };
      case 'inactive': return { text: '비활성', bg: '#fff3e0', color: '#e65100' };
      default: return { text: '미설정', bg: '#f5f5f5', color: '#616161' };
    }
  };

  const borderColor = (status: string) => {
    switch (status) { case 'active': return '#4caf50'; case 'inactive': return '#ff9800'; default: return '#9e9e9e'; }
  };

  return (
    <>
      <div className={st.headerRow}>
        <h2 className="page-title" style={{ margin: 0 }}>외부 시스템 연동 관리</h2>
      </div>

      <div className={st.filterRow}>
        {categories.map((c) => (
          <button key={c.key} onClick={() => setFilter(c.key)}
            className={filter === c.key ? st.filterBtnActive : st.filterBtnInactive}>
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={st.loading}>로딩 중...</div>
      ) : filtered.length === 0 ? (
        <div className={st.loading}>등록된 연동 서비스가 없습니다.</div>
      ) : (
        <div className={st.grid}>
          {filtered.map((svc) => {
            const sl = statusLabel(svc.status);
            return (
              <div key={svc.id} className={`card ${st.svcCard}`} style={{ borderLeft: `4px solid ${borderColor(svc.status)}` }}>
                <div className={st.svcHeader}>
                  <div className={st.svcIcon}>{svc.icon}</div>
                  <div>
                    <h3 className={st.svcName}>{svc.name}</h3>
                    <span className={st.svcStatus} style={{ background: sl.bg, color: sl.color }}>{sl.text}</span>
                  </div>
                </div>
                <span className={st.categoryBadge}>{svc.category}</span>
                <p className={st.svcDesc}>{svc.description}</p>
                {svc.category === 'SMS' && (
                  <div className={st.svcAction}>
                    <button onClick={() => router.push(ROUTES.INTEGRATIONS_SMS_CONFIG)} className={st.configBtn}>
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
