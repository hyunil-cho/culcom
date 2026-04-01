'use client';

import AppLayout from '@/components/layout/AppLayout';
import ComplexSidebar from '@/components/layout/ComplexSidebar';

export default function ComplexLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout sidebar={<ComplexSidebar />}>
      {children}
    </AppLayout>
  );
}
