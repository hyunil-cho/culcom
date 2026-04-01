'use client';

import AppLayout from '@/components/layout/AppLayout';
import MainSidebar from '@/components/layout/MainSidebar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout sidebar={<MainSidebar />}>
      {children}
    </AppLayout>
  );
}
