'use client';

import { useEffect, useState } from 'react';
import { useSessionStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import {
  dashboardApi,
  DashboardData,
  CallerStats,
} from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/Button';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import styles from './page.module.css';

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
        <div className={`card ${styles.noBranchCard}`}>
          <div className={styles.noBranchTitle}>등록된 지점이 없습니다</div>
          <div className={styles.noBranchDesc}>
            지점을 등록해야 고객 관리 등 주요 기능을 이용할 수 있습니다.
          </div>
          <Button onClick={() => router.push(ROUTES.BRANCHES)}>지점 등록하러 가기</Button>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>로딩 중...</div>
      ) : (
        <div className={styles.statsGrid}>
          {statCards.map((card) => (
            <div key={card.title} className={`card ${styles.statCard}`} style={{ borderLeft: `4px solid ${card.color}` }}>
              <div className={styles.statIcon}>{card.icon}</div>
              <div>
                <div className={styles.statTitle}>{card.title}</div>
                <div className={styles.statValue}>{card.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={`card ${styles.section}`}>
        <h3 className={styles.sectionTitle}>최근 7일 예약자 추이</h3>
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
          <div className={styles.emptyChart}>최근 7일간 예약 데이터가 없습니다.</div>
        )}
      </div>

      <div className={`card ${styles.section}`}>
        <div className={styles.callerHeader}>
          <h3>CALLER별 예약 확정 비율</h3>
          <div>
            <div className={styles.periodButtons}>
              {(['day', 'week', 'month'] as Period[]).map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={period === p ? styles.periodBtnActive : styles.periodBtnInactive}>
                  {p === 'day' ? '일간' : p === 'week' ? '주간' : '월간'}
                </button>
              ))}
            </div>
            <div className={styles.periodRange}>기간: {formatDateRange(period)}</div>
          </div>
        </div>

        {callerLoading ? (
          <div className={styles.loading}>데이터를 불러오는 중...</div>
        ) : callerStats.length === 0 ? (
          <div className={styles.loading}>해당 기간에 데이터가 없습니다.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  {['CALLER', '선택 횟수', '예약 확정 수', '확정 비율'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {callerStats.map((stat) => (
                  <tr key={stat.caller}>
                    <td className={styles.callerName}>{stat.caller}</td>
                    <td>{stat.selectionCount}회</td>
                    <td>{stat.reservationConfirm}명</td>
                    <td>
                      <div className={styles.progressBar}>
                        <div className={styles.progressTrack}>
                          <div className={styles.progressFill} style={{ width: `${stat.confirmRate}%` }} />
                        </div>
                        <span className={styles.progressRate}>{stat.confirmRate.toFixed(1)}%</span>
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