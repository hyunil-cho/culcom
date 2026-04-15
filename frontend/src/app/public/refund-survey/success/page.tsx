'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export default function RefundSurveySuccessPage() {
  return <Suspense><RefundSurveySuccessContent /></Suspense>;
}

function RefundSurveySuccessContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || '고객';

  return (
    <div style={{ backgroundColor: '#f0f4ff', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 20 }}>
      <div style={{ background: 'white', padding: 40, borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '100%', maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
        <h1 style={{ color: '#2563eb', fontSize: '1.5rem', marginBottom: 10 }}>설문 응답이 제출되었습니다</h1>
        <p style={{ color: '#666', fontSize: '1rem', marginBottom: 8 }}>
          <strong style={{ color: '#333' }}>{name}</strong>님, 소중한 의견 감사합니다.
        </p>
        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: 30 }}>
          보내주신 의견은 더 나은 서비스를 위해 소중히 반영하겠습니다.
        </p>
        <div style={{ background: '#eff6ff', borderRadius: 8, padding: 16, fontSize: '0.88rem', color: '#555', lineHeight: 1.6 }}>
          설문에 참여해 주셔서 감사합니다.<br />
          환불 처리 결과는 별도로 안내드리겠습니다.
        </div>
      </div>
    </div>
  );
}
