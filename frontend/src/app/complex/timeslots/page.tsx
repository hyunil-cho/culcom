'use client';

import AppLayout from '@/components/layout/AppLayout';

export default function TimeslotsPage() {
  return (
    <AppLayout>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>시간대 설정</h2>
      <div className="card">
        <p style={{ color: 'var(--text-secondary)' }}>수업 시간대를 관리하세요.</p>
      </div>
    </AppLayout>
  );
}
