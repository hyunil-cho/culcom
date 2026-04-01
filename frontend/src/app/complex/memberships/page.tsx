'use client';

import AppLayout from '@/components/layout/AppLayout';

export default function MembershipsPage() {
  return (
    <AppLayout>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>멤버십</h2>
      <div className="card">
        <p style={{ color: 'var(--text-secondary)' }}>멤버십 관리 페이지입니다.</p>
      </div>
    </AppLayout>
  );
}
