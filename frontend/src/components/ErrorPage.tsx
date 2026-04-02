'use client';

import { ROUTES } from '@/lib/routes';

const icons: Record<string, string> = {
  '404': '🔍',
  '403': '🚫',
  '500': '💥',
  '503': '⏸️',
};

export default function ErrorPage({
  code,
  title,
  message,
  detail,
}: {
  code: string;
  title: string;
  message: string;
  detail?: string;
}) {
  const icon = icons[code] ?? '⚠️';
  const timestamp = new Date().toLocaleString('ko-KR');

  return (
    <div style={{
      margin: 0, padding: 0,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        maxWidth: 600, width: '90%', background: 'white', borderRadius: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', padding: '60px 40px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 120, marginBottom: 20 }}>{icon}</div>

        <h1 style={{ fontSize: 72, fontWeight: 800, color: '#f44336', margin: 0, lineHeight: 1 }}>
          {code}
        </h1>
        <h2 style={{ fontSize: 32, fontWeight: 700, color: '#333', margin: '20px 0 10px' }}>
          {title}
        </h2>
        <p style={{ fontSize: 18, color: '#666', margin: '20px 0', lineHeight: 1.6 }}>
          {message}
        </p>

        {detail && (
          <div style={{
            background: '#f5f5f5', borderLeft: '4px solid #f44336',
            padding: 16, borderRadius: 4, margin: '30px 0', textAlign: 'left',
          }}>
            <div style={{ fontWeight: 600, color: '#d32f2f', marginBottom: 8, fontSize: 14 }}>
              상세 정보
            </div>
            <div style={{ color: '#424242', fontSize: 14, lineHeight: 1.6, fontFamily: 'monospace', wordBreak: 'break-word' }}>
              {detail}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 15, justifyContent: 'center', marginTop: 40 }}>
          <a href={ROUTES.DASHBOARD} style={{
            padding: '14px 32px', borderRadius: 8, fontSize: 16, fontWeight: 600,
            textDecoration: 'none', background: '#2196f3', color: 'white', border: 'none',
          }}>
            홈으로
          </a>
          <button onClick={() => history.back()} style={{
            padding: '14px 32px', borderRadius: 8, fontSize: 16, fontWeight: 600,
            background: 'white', color: '#666', border: '2px solid #e0e0e0', cursor: 'pointer',
          }}>
            ← 이전 페이지
          </button>
        </div>

        <div style={{ marginTop: 30, paddingTop: 30, borderTop: '1px solid #e0e0e0', fontSize: 14, color: '#999' }}>
          <p>문제가 지속되면 시스템 관리자에게 문의해주세요.</p>
          <div style={{ fontFamily: 'monospace', color: '#999', fontSize: 12, marginTop: 10 }}>
            오류 발생 시간: {timestamp}
          </div>
        </div>
      </div>
    </div>
  );
}
