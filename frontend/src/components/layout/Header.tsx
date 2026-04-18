'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authApi, SessionRole } from '@/lib/api';
import { useSessionStore } from '@/lib/store';
import { useSidebar } from './SidebarContext';
import { ROUTES } from '@/lib/routes';
import styles from './Header.module.css';

const pageTitles: Record<string, string> = {
  [ROUTES.DASHBOARD]: '대시보드',
  [ROUTES.CUSTOMERS]: '고객 관리',
  [ROUTES.BRANCHES]: '지점 관리',
  [ROUTES.COMPLEX_CLASSES]: '수업 관리',
  [ROUTES.COMPLEX_MEMBERS]: '회원 관리',
  [ROUTES.COMPLEX_STAFFS]: '스태프 관리',
  [ROUTES.COMPLEX_ATTENDANCE]: '통합 팀 관리',
  [ROUTES.COMPLEX_MEMBERSHIPS]: '멤버십 관리',
  [ROUTES.COMPLEX_TIMESLOTS]: '수업 시간대 정보 추가',
  [ROUTES.COMPLEX_POSTPONEMENTS]: '연기 요청',
  [ROUTES.COMPLEX_REFUNDS]: '환불 요청',
  [ROUTES.SURVEY]: '설문 관리',
  [ROUTES.USERS]: '사용자 관리',
  [ROUTES.MY_PAGE]: '마이페이지',
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const sorted = Object.entries(pageTitles).sort((a, b) => b[0].length - a[0].length);
  for (const [path, title] of sorted) {
    if (pathname === path || pathname.startsWith(path + '/')) return title;
  }
  return '백오피스';
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSessionStore((s) => s.session);
  const branches = useSessionStore((s) => s.branches);
  const { toggle: toggleSidebar } = useSidebar();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleBranchChange = async (branchSeq: number) => {
    await authApi.selectBranch(branchSeq);
    window.location.reload();
  };

  const reset = useSessionStore((s) => s.reset);

  const handleLogout = async () => {
    await authApi.logout();
    reset();
    router.push(ROUTES.LOGIN);
  };

  return (
    <>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className={styles.menuToggle} onClick={toggleSidebar} aria-label="메뉴 열기">☰</button>
          <h1 className={styles.title}>{getPageTitle(pathname)}</h1>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.branchSection}>
            {branches.length >= 1 ? (
              <>
                <label className={styles.branchLabel}>지점 선택:</label>
                <select
                  value={session?.selectedBranchSeq ?? ''}
                  onChange={(e) => handleBranchChange(Number(e.target.value))}
                  className={styles.branchSelect}
                >
                  {branches.map((b) => (
                    <option key={b.seq} value={b.seq}>{b.branchName}</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <span className={styles.noBranchText}>등록된 지점이 없습니다.</span>
                {SessionRole.isManager(session) && (
                  <button onClick={() => router.push(ROUTES.BRANCHES_ADD)} className={styles.registerBtn}>
                    등록하기
                  </button>
                )}
              </>
            )}
          </div>
          <div className={styles.userSection}>
            <span>👤</span>
            <span className={styles.userName}>{SessionRole.displayName(session)}</span>
            <a
              href="javascript:void(0);"
              onClick={() => router.push(ROUTES.MY_PAGE)}
              className={styles.logoutLink}
              style={{ marginRight: 8 }}
            >
              마이페이지
            </a>
            <a
              href="javascript:void(0);"
              onClick={() => setShowLogoutModal(true)}
              className={styles.logoutLink}
            >
              로그아웃
            </a>
          </div>
        </div>
      </header>

      {showLogoutModal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowLogoutModal(false); }}
        >
          <div className={`modal-content ${styles.logoutModalContent}`}>
            <div className={styles.logoutModalHeader}>
              <h3 className={styles.logoutModalTitle}>로그아웃 확인</h3>
            </div>
            <div className={styles.logoutModalBody}>
              정말로 로그아웃 하시겠습니까?
            </div>
            <div className={styles.logoutModalFooter}>
              <button onClick={() => setShowLogoutModal(false)} className={styles.logoutCancelBtn}>
                취소
              </button>
              <button onClick={handleLogout} className={styles.logoutConfirmBtn}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}