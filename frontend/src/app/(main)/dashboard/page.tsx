'use client';

import { useSessionStore } from '@/lib/store';

export default function DashboardPage() {
  const session = useSessionStore((s) => s.session);

  return (
    <>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>대시보드</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>현재 지점</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>
            {session?.selectedBranchName ?? '-'}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>로그인 사용자</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>
            {session?.userId ?? '-'}
          </div>
        </div>
      </div>
    </>
  );
}
