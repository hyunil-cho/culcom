'use client';

import AppLayout from '@/components/layout/AppLayout';

export default function RefundsPage() {
  return (
    <AppLayout>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>환불 요청</h2>
      <div className="card">
        <p style={{ color: 'var(--text-secondary)' }}>환불 요청을 관리하세요.</p>
      </div>
    </AppLayout>
  );
}
