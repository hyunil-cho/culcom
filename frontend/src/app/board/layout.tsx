import './board.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CulCom - 공지사항 · 이벤트',
  description: 'CulCom 공지사항 및 이벤트',
};

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
