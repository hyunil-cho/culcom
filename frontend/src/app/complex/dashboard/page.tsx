'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { complexDashboardApi, type MembershipAlertItem, type MembershipAlertsResponse } from '@/lib/api';
import { ROUTES } from '@/lib/routes';

// 고정 기준 — 추후 사용자 설정으로 빼는 것을 고려
const WINDOW_DAYS = 30;
const COUNT_THRESHOLD = 5;

export default function ComplexDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<MembershipAlertsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    complexDashboardApi.membershipAlerts(WINDOW_DAYS, COUNT_THRESHOLD)
      .then(res => { if (res.success) setData(res.data); })
      .finally(() => setLoading(false));
  }, []);

  const goToMember = (memberSeq: number) => {
    router.push(ROUTES.COMPLEX_MEMBER_EDIT(memberSeq));
  };

  return (
    <div style={{ padding: 20 }}>
      <div className="page-toolbar">
        <h2 className="page-title" style={{ marginBottom: 0 }}>대시보드</h2>
      </div>

      {loading && <div style={{ color: '#888', padding: 20 }}>불러오는 중...</div>}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
          <AlertWidget
            title="만료 임박"
            subtitle={`앞으로 ${WINDOW_DAYS}일 이내`}
            accentColor="#f59f00"
            icon="🟠"
            items={data.expiringSoon}
            renderMeta={(it) => <ExpiringMetric daysFromToday={it.daysFromToday} expiryDate={it.expiryDate} />}
            onClickMember={goToMember}
          />

          <AlertWidget
            title="이미 만료"
            subtitle={`최근 ${WINDOW_DAYS}일 이내 만료`}
            accentColor="#e03131"
            icon="🔴"
            items={data.recentlyExpired}
            renderMeta={(it) => <ExpiredMetric daysFromToday={it.daysFromToday} expiryDate={it.expiryDate} />}
            onClickMember={goToMember}
          />

          <AlertWidget
            title="잔여 횟수 임박"
            subtitle={`${COUNT_THRESHOLD}회 이하 남음`}
            accentColor="#fab005"
            icon="🟡"
            items={data.lowRemaining}
            renderMeta={(it) => <RemainingMetric remaining={it.remainingCount} total={it.totalCount} />}
            onClickMember={goToMember}
          />
        </div>
      )}
    </div>
  );
}

/** 만료까지 남은 일수: 큰 D-day + 작은 만료일 */
function ExpiringMetric({ daysFromToday, expiryDate }: { daysFromToday: number | null; expiryDate: string | null }) {
  const days = daysFromToday ?? 0;
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f59f00' }}>
        D-{days}
      </span>
      <span style={{ fontSize: '0.72rem', color: '#999' }}>{expiryDate} 만료</span>
    </div>
  );
}

/** 만료된 지 며칠: 큰 "N일 지남" + 작은 만료일 */
function ExpiredMetric({ daysFromToday, expiryDate }: { daysFromToday: number | null; expiryDate: string | null }) {
  const daysAgo = Math.abs(daysFromToday ?? 0);
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#e03131' }}>
        {daysAgo}일 지남
      </span>
      <span style={{ fontSize: '0.72rem', color: '#999' }}>{expiryDate} 만료</span>
    </div>
  );
}

/** 잔여 횟수: 큰 "N회 남음" + 작은 N/M */
function RemainingMetric({ remaining, total }: { remaining: number | null; total: number | null }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#e8590c' }}>
        {remaining ?? 0}회 남음
      </span>
      <span style={{ fontSize: '0.72rem', color: '#999' }}>(총 {total ?? '?'}회)</span>
    </div>
  );
}

function AlertWidget({
  title, subtitle, accentColor, icon, items, renderMeta, onClickMember,
}: {
  title: string;
  subtitle: string;
  accentColor: string;
  icon: string;
  items: MembershipAlertItem[];
  renderMeta: (item: MembershipAlertItem) => React.ReactNode;
  onClickMember: (memberSeq: number) => void;
}) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e9ecef', borderRadius: 8,
      borderTop: `4px solid ${accentColor}`, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', maxHeight: 480,
    }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f3f5' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#333' }}>
            <span style={{ marginRight: 6 }}>{icon}</span>{title}
          </h3>
          <span style={{
            fontSize: '0.78rem', fontWeight: 700, color: '#fff',
            background: accentColor, borderRadius: 12, padding: '2px 10px',
          }}>{items.length}명</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 4 }}>{subtitle}</div>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {items.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#bbb', fontSize: '0.85rem' }}>
            해당하는 회원이 없습니다.
          </div>
        ) : (
          items.map(it => (
            <div key={it.memberMembershipSeq}
              onClick={() => onClickMember(it.memberSeq)}
              style={{
                padding: '12px 18px', borderBottom: '1px solid #f8f9fa',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                    <strong style={{ color: '#4a90e2', fontSize: '0.95rem' }}>{it.memberName}</strong>
                    <span style={{ fontSize: '0.72rem', color: '#999', fontFamily: 'monospace' }}>{it.phoneNumber}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#888' }}>{it.membershipName ?? '-'}</div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  {renderMeta(it)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
