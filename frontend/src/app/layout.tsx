import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Culcom Backoffice',
  description: 'Culcom 백오피스 관리 시스템',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
