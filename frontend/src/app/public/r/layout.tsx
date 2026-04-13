import type { Metadata } from 'next';
import './landing.css';

export const metadata: Metadata = {
  title: 'E-uT | 영어로 만나, 서로를 알아가는 공간 — 대화 중심 영어회화 커뮤니티',
  description:
    'E-uT는 수업보다 대화 경험을 중요하게 생각하는 영어회화 스터디 커뮤니티입니다. 소규모 테이블 회화, 네트워킹 이벤트, 실전 공간 이용까지.',
  openGraph: {
    title: 'E-uT | 영어로 만나, 서로를 알아가는 공간',
    description: '수업보다 대화 경험을 중요하게 생각하는 영어회화 커뮤니티',
    type: 'website',
  },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Google Fonts — 원본 design 의 Noto Sans KR + Outfit. Next 가 <head> 로 자동 hoist */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&family=Outfit:wght@300;400;600;700;900&display=swap"
      />
      {children}
    </>
  );
}
