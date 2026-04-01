'use client';

import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={{ marginLeft: 240, flex: 1, minHeight: '100vh' }}>
        <Header />
        <main style={{ padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
