'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useSessionStore } from '@/lib/store';

const pageTitles: Record<string, string> = {
  '/dashboard': '대시보드',
  '/customers': '고객 관리',
  '/branches': '지점 관리',
  '/complex/classes': '수업 관리',
  '/complex/members': '회원 관리',
  '/complex/staffs': '스태프 관리',
  '/complex/attendance': '출석 관리',
  '/complex/memberships': '멤버십',
  '/complex/timeslots': '시간대 설정',
  '/complex/postponements': '연기 요청',
  '/complex/refunds': '환불 요청',
  '/complex/survey': '설문 관리',
  '/users': '사용자 관리',
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(path)) return title;
  }
  return '백오피스';
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSessionStore((s) => s.session);
  const branches = useSessionStore((s) => s.branches);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleBranchChange = async (branchSeq: number) => {
    await authApi.selectBranch(branchSeq);
    window.location.reload();
  };

  const handleLogout = async () => {
    await authApi.logout();
    router.push('/login');
  };

  return (
    <>
      <header className="top-header" style={{
        height: 56,
        backgroundColor: 'white',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}>
        <div className="header-left">
          <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#2c3e50' }}>
            {getPageTitle(pathname)}
          </h1>
        </div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ marginRight: '2rem', display: 'flex', alignItems: 'center' }}>
            {branches.length > 1 ? (
              <>
                <label style={{ marginRight: '0.5rem', color: '#5a6c7d', fontSize: '0.9rem' }}>지점 선택:</label>
                <select
                  value={session?.selectedBranchSeq ?? ''}
                  onChange={(e) => handleBranchChange(Number(e.target.value))}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    background: 'white',
                  }}
                >
                  {branches.map((b) => (
                    <option key={b.seq} value={b.seq}>{b.branchName}</option>
                  ))}
                </select>
              </>
            ) : (
              <span style={{ fontSize: '0.9rem', color: '#2c3e50' }}>
                {session?.selectedBranchName ?? '-'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>👤</span>
            <span style={{ fontSize: '0.9rem', color: '#2c3e50' }}>
              {session?.role === 'ROOT' ? '최고관리자' : session?.role === 'BRANCH_MANAGER' ? '지점장' : '직원'}
            </span>
            <a
              href="javascript:void(0);"
              onClick={() => setShowLogoutModal(true)}
              style={{
                marginLeft: '0.5rem',
                color: '#4a90e2',
                textDecoration: 'none',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              로그아웃
            </a>
          </div>
        </div>
      </header>

      {showLogoutModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowLogoutModal(false); }}
          style={{
            display: 'flex',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 10000,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{
            background: 'white',
            borderRadius: 12,
            width: '90%',
            maxWidth: 400,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '2px solid #4a90e2' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#2c3e50' }}>로그아웃 확인</h3>
            </div>
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666', fontSize: '0.95rem' }}>
              정말로 로그아웃 하시겠습니까?
            </div>
            <div style={{
              padding: '1rem 2rem',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              gap: '0.75rem',
            }}>
              <button
                onClick={() => setShowLogoutModal(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  fontSize: '1rem',
                  border: '1px solid #ddd',
                  background: 'white',
                  color: '#666',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={handleLogout}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  fontSize: '1rem',
                  border: 'none',
                  background: '#4a90e2',
                  color: 'white',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
