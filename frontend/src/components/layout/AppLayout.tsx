'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from './Header';
import { useSessionStore } from '@/lib/store';

export default function AppLayout({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const fetchSession = useSessionStore((s) => s.fetchSession);

  useEffect(() => {
    fetchSession().catch(() => router.push('/login'));
  }, [fetchSession, router]);

  return (
    <div style={{ display: 'flex' }}>
      {sidebar}
      <div style={{ marginLeft: 240, flex: 1, minHeight: '100vh' }}>
        <Header />
        <main style={{ padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
