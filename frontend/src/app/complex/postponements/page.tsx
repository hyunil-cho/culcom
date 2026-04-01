'use client';

import AppLayout from '@/components/layout/AppLayout';

export default function PostponementsPage() {
  return (
    <AppLayout>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>연기 요청</h2>
      <div className="card">
        <p style={{ color: 'var(--text-secondary)' }}>연기 요청을 관리하세요.</p>
      </div>
    </AppLayout>
  );
}
