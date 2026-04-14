'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from './Header';
import { SidebarProvider } from './SidebarContext';
import { useSessionStore } from '@/lib/store';
import { SessionRole } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import styles from './AppLayout.module.css';

export default function AppLayout({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const fetchSession = useSessionStore((s) => s.fetchSession);
  const session = useSessionStore((s) => s.session);
  const branches = useSessionStore((s) => s.branches);
  const loaded = useSessionStore((s) => s.loaded);
  const [showNoBranchModal, setShowNoBranchModal] = useState(false);

  useEffect(() => {
    fetchSession().catch(() => router.push(ROUTES.LOGIN));
  }, [fetchSession, router]);

  useEffect(() => {
    if (!loaded || !session) return;
    if (SessionRole.isRoot(session)) return;
    if (branches.length === 0) {
      if (!pathname.startsWith(ROUTES.BRANCHES)) {
        router.replace(ROUTES.BRANCHES);
      }
      setShowNoBranchModal(true);
    }
  }, [loaded, session, branches, pathname, router]);

  return (
    <SidebarProvider>
      <div className={styles.container}>
      {sidebar}
      <div className={styles.mainArea}>
        <Header />
        <main className={styles.content}>
          {children}
        </main>
      </div>

      {showNoBranchModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '90%', maxWidth: 420 }}>
            <div className={styles.noBranchModalHeader}>
              <h3 className={styles.noBranchModalTitle}>지점 등록 필요</h3>
            </div>
            <div className={styles.noBranchModalBody}>
              현재 계정에 등록된 지점이 없습니다.<br />
              서비스를 이용하려면 먼저 지점을 등록해주세요.
            </div>
            <div className={styles.noBranchModalFooter}>
              <button
                onClick={() => {
                  setShowNoBranchModal(false);
                  router.push(ROUTES.BRANCHES_ADD);
                }}
                className={styles.noBranchBtn}
              >
                지점 등록하기
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </SidebarProvider>
  );
}