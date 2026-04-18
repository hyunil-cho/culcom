'use client';

import { useState } from 'react';

/**
 * 대시보드 진입 시 복귀안내 SMS 템플릿이 미설정이면 띄우는 경고 모달.
 * 클릭 시 SMS 설정 페이지로 이동.
 */
export default function ReturnTemplateMissingModal({ onConfirm }: { onConfirm: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', borderRadius: 10, width: '90%', maxWidth: 440,
        padding: '1.5rem 2rem', textAlign: 'center',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: 10 }}>⚠️</div>
        <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', color: '#dc2626' }}>
          복귀 안내 SMS 템플릿 미설정
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: '#374151', lineHeight: 1.5 }}>
          복귀자에게 전송할 메시지 템플릿을 설정하세요
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setDismissed(true)}
            style={{
              flex: 1, padding: '10px 16px', background: '#fff',
              border: '1px solid #d1d5db', borderRadius: 6,
              fontSize: '0.9rem', cursor: 'pointer', color: '#6b7280',
            }}>
            나중에
          </button>
          <button onClick={onConfirm}
            style={{
              flex: 1, padding: '10px 16px', background: '#4a90e2',
              border: 'none', borderRadius: 6, color: '#fff',
              fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
            }}>
            설정하러 가기
          </button>
        </div>
      </div>
    </div>
  );
}
