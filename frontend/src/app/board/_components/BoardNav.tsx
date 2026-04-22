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
          <span className="logo-text">E:UT</span>
          <span className="logo-divider"></span>
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
          <div className="nav-right">
            <Link href="/board/login" className="nav-mypage-btn">
              로그인
            </Link>
            <Link href="/board/signup" className="nav-mypage-btn">
              회원가입
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
