'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export default function RefundSuccessPage() {
  return <Suspense><RefundSuccessContent /></Suspense>;
}

function RefundSuccessContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || '고객';

  return (
    <div style={{ backgroundColor: '#f4f7f6', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 20 }}>
      <div style={{ background: 'white', padding: 40, borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '100%', maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
        <h1 style={{ color: '#2e7d32', fontSize: '1.5rem', marginBottom: 10 }}>환불 요청이 접수되었습니다</h1>
        <p style={{ color: '#666', fontSize: '1rem', marginBottom: 8 }}>
          <strong style={{ color: '#333' }}>{name}</strong>님의 환불 요청이 정상적으로 접수되었습니다.
        </p>
        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: 30 }}>관리자 확인 후 처리 결과를 안내드리겠습니다.</p>
        <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 16, fontSize: '0.88rem', color: '#555', lineHeight: 1.6 }}>
          <strong>다음 단계</strong><br />
          담당자가 요청을 확인하고 환불 처리를 진행합니다.<br />
          처리 결과는 등록된 연락처로 안내드립니다.
        </div>
      </div>
    </div>
  );
}
