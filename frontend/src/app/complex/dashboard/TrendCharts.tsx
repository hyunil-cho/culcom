'use client';

import { useState } from 'react';
import { useApiQuery } from '@/hooks/useApiQuery';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { complexDashboardApi, type TrendResponse, type TrendItem, type TrendPeriod } from '@/lib/api';

// 기간별 기본 버킷 개수
const DEFAULT_COUNT: Record<TrendPeriod, number> = {
  day: 14,
  week: 12,
  month: 6,
  year: 5,
};

const PERIOD_LABELS: { value: TrendPeriod; label: string }[] = [
  { value: 'day', label: '일' },
  { value: 'week', label: '주' },
  { value: 'month', label: '월' },
  { value: 'year', label: '연' },
];

/** ISO 8601 주차 (MySQL %x-%v 와 동일한 포맷) */
function isoWeekKey(d: Date): string {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-${String(week).padStart(2, '0')}`;
}

/** 기간/개수에 맞춰 빈 버킷을 채워 N개 시리즈 생성 (오래된 → 최근 순) */
function fillBuckets(items: TrendItem[], period: TrendPeriod, count: number): { bucket: string; count: number }[] {
  const map = new Map(items.map(i => [i.bucket, i.count]));
  const result: { bucket: string; count: number }[] = [];
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    let key: string;
    if (period === 'day') {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } else if (period === 'week') {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
      key = isoWeekKey(d);
    } else if (period === 'year') {
      key = String(now.getFullYear() - i);
    } else {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    result.push({ bucket: key, count: map.get(key) ?? 0 });
  }
  return result;
}

/** 기간별 X축 라벨 포맷 */
function formatBucket(period: TrendPeriod) {
  return (value: unknown) => {
    const s = String(value);
    if (period === 'day') {
      const [, m, d] = s.split('-');
      return m && d ? `${parseInt(m)}/${parseInt(d)}` : s;
    }
    if (period === 'week') {
      const [, w] = s.split('-');
      return w ? `${parseInt(w)}주` : s;
    }
    if (period === 'year') {
      return `${s}년`;
    }
    const [, m] = s.split('-');
    return m ? `${parseInt(m)}월` : s;
  };
}

const CARD: React.CSSProperties = {
  background: '#fff', border: '1px solid #e9ecef', borderRadius: 8,
  padding: '20px 24px', marginBottom: 16,
};

const TAB_BAR: React.CSSProperties = {
  display: 'inline-flex', border: '1px solid #dee2e6', borderRadius: 6, overflow: 'hidden', marginBottom: 12,
};

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 16px',
    fontSize: '0.85rem',
    border: 'none',
    borderRight: '1px solid #dee2e6',
    background: active ? '#4a90e2' : '#fff',
    color: active ? '#fff' : '#495057',
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
  };
}

export default function TrendCharts() {
  const [period, setPeriod] = useState<TrendPeriod>('month');

  const { data = null } = useApiQuery<TrendResponse>(
    ['complexDashboard', 'trends', period],
    () => complexDashboardApi.trends(period, DEFAULT_COUNT[period]),
  );

  if (!data) return null;

  const count = DEFAULT_COUNT[period];

  const filledStaffs = fillBuckets(data.staffs, period, count);
  const memberData = fillBuckets(data.members, period, count).map((m, i) => ({
    bucket: m.bucket,
    회원: m.count,
    스태프: filledStaffs[i].count,
  }));

  const filledRefunds = fillBuckets(data.refunds, period, count);
  const filledTransfers = fillBuckets(data.transfers, period, count);
  const requestData = fillBuckets(data.postponements, period, count).map((m, i) => ({
    bucket: m.bucket,
    연기: m.count,
    환불: filledRefunds[i].count,
    양도: filledTransfers[i].count,
  }));

  const returnData = fillBuckets(data.postponementReturns ?? [], period, count).map(m => ({
    bucket: m.bucket,
    복귀예정: m.count,
  }));

  const tickFormatter = formatBucket(period);

  return (
    <div>
      <div style={TAB_BAR}>
        {PERIOD_LABELS.map((p, idx) => (
          <button
            key={p.value}
            type="button"
            style={{
              ...tabStyle(period === p.value),
              borderRight: idx === PERIOD_LABELS.length - 1 ? 'none' : '1px solid #dee2e6',
            }}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div style={CARD}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#333' }}>회원 / 스태프 등록 추이</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={memberData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="bucket" tickFormatter={tickFormatter} fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip labelFormatter={tickFormatter} />
              <Legend />
              <Bar dataKey="회원" fill="#4a90e2" radius={[4, 4, 0, 0]} />
              <Bar dataKey="스태프" fill="#f59f00" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={CARD}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#333' }}>연기 / 환불 / 양도 요청 추이</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={requestData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="bucket" tickFormatter={tickFormatter} fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip labelFormatter={tickFormatter} />
              <Legend />
              <Line type="monotone" dataKey="연기" stroke="#7048e8" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="환불" stroke="#e03131" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="양도" stroke="#2b8a3e" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={CARD}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#333' }}>복귀 예정자 추이</h3>
          <p style={{ margin: '0 0 12px', fontSize: '0.75rem', color: '#888' }}>
            매일 오전 11시 스케줄러가 다음날 복귀 회원을 집계한 결과
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={returnData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="bucket" tickFormatter={tickFormatter} fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip labelFormatter={tickFormatter} />
              <Legend />
              <Bar dataKey="복귀예정" fill="#0ca678" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}