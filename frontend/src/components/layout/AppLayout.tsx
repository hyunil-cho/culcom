'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from './Header';
import { useSessionStore } from '@/lib/store';
import { SessionRole } from '@/lib/api';
import { ROUTES } from '@/lib/routes';

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
    <div style={{ display: 'flex' }}>
      {sidebar}
      <div style={{ marginLeft: 240, flex: 1, minHeight: '100vh' }}>
        <Header />
        <main style={{ padding: 24 }}>
          {children}
        </main>
      </div>

      {showNoBranchModal && (
        <div
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
            maxWidth: 420,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '2px solid #e74c3c' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#2c3e50' }}>지점 등록 필요</h3>
            </div>
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666', fontSize: '0.95rem', lineHeight: 1.6 }}>
              현재 계정에 등록된 지점이 없습니다.<br />
              서비스를 이용하려면 먼저 지점을 등록해주세요.
            </div>
            <div style={{
              padding: '1rem 2rem',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'center',
            }}>
              <button
                onClick={() => {
                  setShowNoBranchModal(false);
                  router.push(ROUTES.BRANCHES_ADD);
                }}
                style={{
                  padding: '0.75rem 2rem',
                  fontSize: '1rem',
                  border: 'none',
                  background: '#4a90e2',
                  color: 'white',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                지점 등록하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
