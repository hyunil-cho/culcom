'use client';

import { useBoardSession } from '../../board/_hooks/useBoardSession';

export default function KakaoSuccessPage() {
  const { session } = useBoardSession(true);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to bottom, #FFE5B4 0%, #FFF8DC 100%)',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Noto Sans KR', 'Inter', sans-serif",
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '30px',
          padding: '3rem 2.5rem',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          maxWidth: '600px',
          width: '100%',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* 로고 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1
            style={{
              fontFamily: "'Brush Script MT', cursive, 'Segoe Script', cursive",
              color: '#dc3545',
              fontSize: '3rem',
              fontWeight: 700,
              margin: 0,
              fontStyle: 'italic',
            }}
          >
            CulCom
          </h1>
        </div>

        {/* 타이틀 */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.95rem', color: '#666', marginBottom: '0.5rem' }}>
            20년 된 컬컴 영어, 일어, 중국어
          </p>
          <h1
            style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              color: '#dc3545',
              marginBottom: '1.5rem',
              textShadow: '2px 2px 0px rgba(255,255,255,0.8)',
            }}
          >
            스터디 지원 성공!
          </h1>
        </div>

        {/* 캐릭터 */}
        <div style={{ margin: '2rem 0', position: 'relative' }}>
          <div style={{ fontSize: '6rem', marginBottom: '1rem' }}>💗🐱</div>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginTop: '1rem' }}>
            <span style={{ fontSize: '0.9rem', fontStyle: 'italic', color: '#666' }}>Be cultured 💕</span>
            <span style={{ fontSize: '0.9rem', fontStyle: 'italic', color: '#666' }}>speak better ✨</span>
          </div>
        </div>

        {/* 메시지 박스 */}
        <div
          style={{
            background: '#FFF8DC',
            border: '3px dashed #666',
            borderRadius: '15px',
            padding: '2rem 1.5rem',
            margin: '2rem 0',
          }}
        >
          <p style={{ fontSize: '1.3rem', fontWeight: 700, color: '#333', marginBottom: '1rem' }}>
            한 걸음 나아가셨군요 :D
          </p>
          <p style={{ fontSize: '0.95rem', color: '#666', lineHeight: 1.6 }}>
            <span style={{ color: '#dc3545', fontWeight: 800 }}>{session.memberName}</span>님, 환영합니다!
            <br />
            스터디 안내 연락드릴게요!
            <br />
            <br />
            교육청 인가받은, 16단계 레벨별 커리큘럼으로
            <br />
            영어, 일어, 중국어를 잘 갖춰서!
          </p>
        </div>

        {/* 포토 섹션 */}
        <div
          style={{
            marginTop: '2rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.5rem',
            borderRadius: '15px',
            overflow: 'hidden',
          }}
        >
          {['📚', '🎓', '✨'].map((emoji) => (
            <div
              key={emoji}
              style={{
                aspectRatio: '1',
                background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
              }}
            >
              {emoji}
            </div>
          ))}
        </div>

        {/* 버튼 */}
        <a
          href="/board"
          style={{
            display: 'inline-block',
            padding: '1.2rem 3rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '30px',
            fontWeight: 700,
            fontSize: '1.1rem',
            marginTop: '2rem',
          }}
        >
          처음으로 돌아가기
        </a>
      </div>
    </div>
  );
}
