'use client';

import AppLayout from '@/components/layout/AppLayout';

export default function SurveyPage() {
  return (
    <AppLayout>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>설문 관리</h2>
      <div className="card">
        <p style={{ color: 'var(--text-secondary)' }}>설문 템플릿을 관리하세요.</p>
      </div>
    </AppLayout>
  );
}
