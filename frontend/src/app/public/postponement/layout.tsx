import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '수업 연기 요청 - Culcom',
  description: '수업 연기 요청을 진행합니다. 회원 정보를 확인한 후 연기 요청을 제출할 수 있습니다.',
};

export default function PostponementLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
