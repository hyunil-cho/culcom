'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import BoardNav from '../_components/BoardNav';
import BoardFooter from '../_components/BoardFooter';
import { useBoardSession } from '../_hooks/useBoardSession';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useBoardSession();

  const initialError = searchParams.get('error') === 'email_conflict'
    ? '이미 일반 회원가입으로 사용 중인 이메일입니다. 이메일/비밀번호로 로그인해주세요.'
    : '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/public/board/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = '/board';
      } else {
        setError(data.message || '로그인에 실패했습니다');
      }
    } catch {
      setError('로그인 처리 중 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <BoardNav isLoggedIn={session.isLoggedIn} memberName={session.memberName} />
      <main className="board-main">
        <div className="board-container" style={{ maxWidth: 440, paddingTop: 40, paddingBottom: 40 }}>
          <div style={{
            background: 'var(--board-surface)',
            border: '1px solid var(--board-border)',
            borderRadius: 'var(--board-radius)',
            boxShadow: 'var(--board-shadow-md)',
            padding: 36,
          }}>
            <h1 style={{ fontSize: 24, marginBottom: 8 }}>로그인</h1>
            <p style={{ color: 'var(--board-text-sub)', fontSize: 14, marginBottom: 24 }}>
              이메일 계정 또는 카카오로 로그인해주세요.
            </p>

            {error && (
              <div style={{
                padding: 12, borderRadius: 8, background: '#fef2f2', color: '#b91c1c',
                fontSize: 13, marginBottom: 16,
              }}>{error}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--board-text-sub)' }}>이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--board-text-sub)' }}>비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={inputStyle}
                  autoComplete="current-password"
                />
              </div>
              <button type="submit" disabled={submitting} style={primaryBtnStyle}>
                {submitting ? '로그인 중...' : '로그인'}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0', color: 'var(--board-text-muted)', fontSize: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--board-border)' }} />
              <span>또는</span>
              <div style={{ flex: 1, height: 1, background: 'var(--board-border)' }} />
            </div>

            <a href="/api/public/kakao/login" className="nav-login-btn" style={{ width: '100%', justifyContent: 'center' }}>
              <svg className="kakao-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.48 3 2 6.58 2 10.94c0 2.8 1.86 5.27 4.66 6.67l-1.19 4.39 5.09-3.36c.47.04.95.06 1.44.06 5.52 0 10-3.58 10-7.94S17.52 3 12 3z" />
              </svg>
              카카오로 로그인
            </a>

            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--board-text-sub)', marginTop: 24 }}>
              계정이 없으신가요?{' '}
              <Link href="/board/signup" style={{ color: 'var(--board-primary)', fontWeight: 600 }}>회원가입</Link>
            </p>
          </div>
        </div>
      </main>
      <BoardFooter />
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--board-border)',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'var(--board-font)',
  outline: 'none',
};

const primaryBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  background: 'var(--board-primary)',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--board-font)',
};

export default function BoardLoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
