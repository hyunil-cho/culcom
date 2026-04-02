'use client';

import { useEffect, useState } from 'react';
import { useSessionStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import {
  dashboardApi,
  DashboardData,
  CallerStats,
} from '@/lib/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

type Period = 'day' | 'week' | 'month';

export default function DashboardPage() {
  const session = useSessionStore((s) => s.session);
  const router = useRouter();
  const noBranch = session && !session.selectedBranchSeq;

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [callerStats, setCallerStats] = useState<CallerStats[]>([]);
  const [period, setPeriod] = useState<Period>('day');
  const [loading, setLoading] = useState(true);
  const [callerLoading, setCallerLoading] = useState(true);

  useEffect(() => {
    dashboardApi.get().then((res) => {
      if (res.success) setDashboard(res.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setCallerLoading(true);
    dashboardApi.callerStats(period).then((res) => {
      if (res.success) setCallerStats(res.data);
      setCallerLoading(false);
    });
  }, [period]);

  const chartData = (dashboard?.dailyStats ?? []).map((d) => {
    const date = new Date(d.date);
    return {
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      count: d.count,
      reservationCount: d.reservationCount,
    };
  });

  const formatDateRange = (p: Period) => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    if (p === 'day') return fmt(today);
    const start = new Date(today);
    start.setDate(today.getDate() - (p === 'week' ? 6 : 29));
    return `${fmt(start)} ~ ${fmt(today)}`;
  };

  const statCards = dashboard
    ? [
        { title: '금일 총 예약자', value: `${dashboard.todayTotalCustomers}명`, icon: '👥', color: '#3498db' },
        { title: 'SMS 잔여건수', value: `${dashboard.smsRemaining}건`, icon: '💬', color: '#3498db' },
        { title: 'LMS 잔여건수', value: `${dashboard.lmsRemaining}건`, icon: '📧', color: '#9b59b6' },
      ]
    : [];

  return (
    <>
      <h2 className="page-title">대시보드</h2>

      {noBranch && (
        <div className="card" style={{
          backgroundColor: '#fff3cd', border: '1px solid #ffc107',
          padding: '1.5rem', marginBottom: 24,
        }}>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#856404', marginBottom: 8 }}>
            등록된 지점이 없습니다
          </div>
          <div style={{ fontSize: '0.9rem', color: '#856404', marginBottom: 12 }}>
            지점을 등록해야 고객 관리 등 주요 기능을 이용할 수 있습니다.
          </div>
          <button className="btn-primary" onClick={() => router.push('/branches')}>
            지점 등록하러 가기
          </button>
        </div>
      )}

      {/* 통계 카드 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>로딩 중...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {statCards.map((card) => (
            <div key={card.title} className="card" style={{ borderLeft: `4px solid ${card.color}`, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 28 }}>{card.icon}</div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{card.title}</div>
                <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{card.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 최근 7일 예약자 추이 차트 */}
      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 16 }}>최근 7일 예약자 추이</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} tickFormatter={(v) => `${v}명`} />
              <Tooltip formatter={(value, name) => {
                const label = name === 'count' ? '예약자 수' : '예약 확정자 수';
                return [`${value}명`, label];
              }} />
              <Legend formatter={(value) => value === 'count' ? '예약자 수' : '예약 확정자 수'} />
              <Line type="monotone" dataKey="count" stroke="#3498db" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="reservationCount" stroke="#2ecc71" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            최근 7일간 예약 데이터가 없습니다.
          </div>
        )}
      </div>

      {/* CALLER별 예약 확정 비율 */}
      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <h3>CALLER별 예약 확정 비율</h3>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {(['day', 'week', 'month'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    padding: '8px 16px',
                    border: `1px solid ${period === p ? '#3498db' : '#ddd'}`,
                    background: period === p ? '#3498db' : 'white',
                    color: period === p ? 'white' : '#666',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  {p === 'day' ? '일간' : p === 'week' ? '주간' : '월간'}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 14, color: '#666' }}>기간: {formatDateRange(period)}</div>
          </div>
        </div>

        {callerLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>데이터를 불러오는 중...</div>
        ) : callerStats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>해당 기간에 데이터가 없습니다.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['CALLER', '선택 횟수', '예약 확정 수', '확정 비율'].map((h) => (
                    <th key={h} style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #eee', background: '#f8f9fa', fontWeight: 600, color: '#333' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {callerStats.map((stat) => (
                  <tr key={stat.caller} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 12, fontWeight: 600 }}>{stat.caller}</td>
                    <td style={{ padding: 12 }}>{stat.selectionCount}회</td>
                    <td style={{ padding: 12 }}>{stat.reservationConfirm}명</td>
                    <td style={{ padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 8, background: '#e9ecef', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${stat.confirmRate}%`, background: 'linear-gradient(90deg, #3498db, #2ecc71)', transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontWeight: 600, color: '#3498db', minWidth: 60, textAlign: 'right' }}>
                          {stat.confirmRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
