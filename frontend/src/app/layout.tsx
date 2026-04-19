import type { Metadata } from 'next';
import QueryProvider from '@/components/providers/QueryProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'E-UT 백오피스',
  description: 'E-UT 백오피스 관리 시스템',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body><QueryProvider>{children}</QueryProvider></body>
    </html>
  );
}
