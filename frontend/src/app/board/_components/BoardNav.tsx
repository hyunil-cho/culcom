'use client';

import Link from 'next/link';

interface BoardNavProps {
  isLoggedIn: boolean;
  memberName?: string;
  activePage?: 'mypage';
}

export default function BoardNav({ isLoggedIn, memberName, activePage }: BoardNavProps) {
  const handleLogout = async () => {
    try {
      await fetch('/api/public/board/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore
    }
    window.location.href = '/board';
  };

  return (
    <nav className="board-nav">
      <div className="board-container nav-inner">
        <Link href="/board" className="board-logo">
          <span className="logo-icon">📢</span>
          <span className="logo-text">CulCom</span>
          <span className="logo-divider"></span>
          <span className="logo-sub">공지 · 이벤트</span>
        </Link>
        {isLoggedIn ? (
          <div className="nav-right">
            <span className="nav-username">{memberName}님</span>
            <Link
              href="/board/mypage"
              className={`nav-mypage-btn${activePage === 'mypage' ? ' active' : ''}`}
            >
              마이페이지
            </Link>
            <button
              type="button"
              className="nav-logout-btn"
              onClick={handleLogout}
              style={{ border: 'none', cursor: 'pointer', fontFamily: 'var(--board-font)' }}
            >
              로그아웃
            </button>
          </div>
        ) : (
          <a href="/api/public/kakao/login" className="nav-login-btn">
            <svg className="kakao-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.48 3 2 6.58 2 10.94c0 2.8 1.86 5.27 4.66 6.67l-1.19 4.39 5.09-3.36c.47.04.95.06 1.44.06 5.52 0 10-3.58 10-7.94S17.52 3 12 3z" />
            </svg>
            카카오 로그인
          </a>
        )}
      </div>
    </nav>
  );
}
