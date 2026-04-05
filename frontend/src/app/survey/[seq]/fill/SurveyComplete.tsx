'use client';

interface SurveyCompleteProps {
  name: string;
}

export default function SurveyComplete({ name }: SurveyCompleteProps) {
  const displayName = name || '고객';

  return (
    <div style={S.body}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={S.card}>
          {/* 체크 아이콘 */}
          <div style={S.checkCircle}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1a1a1a', marginBottom: '0.75rem' }}>
            🎉 상담 신청이 완료되었습니다!
          </div>

          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#2d7a4f', marginBottom: '0.75rem' }}>
            {displayName}님
          </div>

          <div style={{ fontSize: '1rem', color: '#555', marginBottom: '0.25rem' }}>
            신청해주셔서 감사합니다.
          </div>
          <div style={{ fontSize: '1rem', color: '#555', marginBottom: '2rem' }}>
            곧 <strong style={{ color: '#2d7a4f' }}>상담 연락</strong>을 드리겠습니다!
          </div>

          {/* 다음 단계 카드 */}
          <div style={S.nextSteps}>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1a1a1a', marginBottom: '1rem', textAlign: 'center' }}>
              📋 다음 단계
            </div>
            {[
              '담당자가 연락처를 확인합니다',
              '빠른 시일 내에 전화를 드립니다',
              '상세한 상담을 진행합니다',
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: i < 2 ? '0.65rem' : 0 }}>
                <span style={{ color: '#2d7a4f', fontWeight: 700, fontSize: '1rem' }}>✓</span>
                <span style={{ fontSize: '0.92rem', color: '#333' }}>{text}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '0.88rem', color: '#888', lineHeight: 1.6 }}>
            궁금하신 점이 있으시면<br />
            언제든지 <strong style={{ color: '#1a1a1a' }}>문의</strong>해주세요!
          </div>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  body: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif',
    background: '#f6faf8', color: '#1a1a1a', minHeight: '100vh', padding: '2rem 1rem 4rem',
  },
  card: {
    background: 'white', borderRadius: 20, boxShadow: '0 4px 24px rgba(45,122,79,0.12)',
    padding: '3rem 2rem 2.5rem', textAlign: 'center',
  },
  checkCircle: {
    width: 72, height: 72, borderRadius: '50%', background: '#2d7a4f',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 1.75rem',
  },
  nextSteps: {
    background: '#f0faf4', borderRadius: 12, padding: '1.5rem 1.75rem',
    textAlign: 'left', marginBottom: '2rem',
  },
};
