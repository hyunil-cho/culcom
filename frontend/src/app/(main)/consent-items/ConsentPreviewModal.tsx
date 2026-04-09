'use client';

import { useState } from 'react';

export default function ConsentPreviewModal({
  title, content, required, onClose,
}: {
  title: string;
  content: string;
  required: boolean;
  onClose: () => void;
}) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ width: '90%', maxWidth: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        {/* 헤더 */}
        <div style={{ padding: '1rem 1.5rem', background: '#6366f1', color: '#fff' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>동의항목 미리보기</h3>
        </div>

        {/* 본문 — 사용자에게 보이는 형태 */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <h4 style={{ margin: 0, fontSize: '1rem', color: '#111827' }}>{title}</h4>
              <span style={{
                fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                color: required ? '#dc2626' : '#6b7280',
                background: required ? '#fef2f2' : '#f3f4f6',
              }}>
                {required ? '필수' : '선택'}
              </span>
            </div>

            <div style={{
              padding: '1rem', background: '#f9fafb', border: '1px solid #e5e7eb',
              borderRadius: 8, maxHeight: 300, overflowY: 'auto',
              fontSize: '0.85rem', color: '#374151', lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}>
              {content}
            </div>
          </div>

          {/* 동의 체크박스 */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
            background: agreed ? '#f0fdf4' : '#fff', border: `1.5px solid ${agreed ? '#bbf7d0' : '#e5e7eb'}`,
            borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
          }}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#10b981' }} />
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: agreed ? '#15803d' : '#374151' }}>
              {title}에 동의합니다{required ? '' : ' (선택)'}
            </span>
          </label>
        </div>

        {/* 푸터 */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <div style={{ flex: 1, fontSize: '0.78rem', color: '#9ca3af', alignSelf: 'center' }}>
            * 실제 사용자에게 표시되는 화면의 미리보기입니다.
          </div>
          <button onClick={onClose} style={{
            padding: '8px 20px', border: '1px solid #ccc', borderRadius: 6,
            background: '#fff', cursor: 'pointer', fontSize: '0.88rem',
          }}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
