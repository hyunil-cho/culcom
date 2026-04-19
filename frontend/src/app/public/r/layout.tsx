import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './landing.css';

const SITE_URL = 'https://www.eutgumi.co.kr';
const OG_IMAGE = `${SITE_URL}/images/og-main.jpg`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: '이웃 E-uT | 구미 영어회화, 수업보다 대화로 배우는 공간',
  description:
    '구미 No.1 영어회화 커뮤니티 이웃 E-uT. 공부만 하는 영어는 이제 그만! 소규모 테이블에서 즐겁게 대화하며 실전 실력을 키우세요.',
  keywords: [
    '영어회화', '직장인영어회화', '영어스터디', '성인영어학원', '영어커뮤니티',
    '소규모영어회화', 'E-uT', '구미영어회화', '구미영어스터디', '구미직장인영어',
    '이웃영어회화', '실전영어', '이웃영어스터디',
  ],
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    locale: 'ko_KR',
    type: 'website',
    siteName: '이웃 E-uT 영어회화 커뮤니티',
    title: '이웃 E-uT | 수업보다 대화, 영어가 재미있어지는 공간',
    description:
      '공부만 하는 영어는 이제 그만! 구미 이웃 E-uT 영어회화에서 소규모 테이블에서 즐겁게 대화하며 진짜 실력을 키우세요.',
    url: SITE_URL,
    images: [
      {
        url: OG_IMAGE,
        secureUrl: OG_IMAGE,
        type: 'image/jpeg',
        width: 1200,
        height: 630,
        alt: '구미 E-uT 영어회화 커뮤니티 활동 모습',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '이웃 E-uT 영어회화 | 구미 영어회화 커뮤니티',
    description: '공부보다 대화 중심, 진짜 영어를 쓰는 공간 이웃 E-uT',
    images: [OG_IMAGE],
  },
  appleWebApp: { title: '이웃 E-uT' },
  icons: {
    icon: '/icon.jpg',
    apple: '/apple-touch-icon.png',
  },
  verification: {
    google: 'RzIj6sDsobPCdcv6QgGtcD5fstgvDQiV-AIwjTYgQmw',
    other: { 'naver-site-verification': '37db44b53edcf74e2a56c36c9dc3417205ff021d' },
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
};

const LOCAL_BUSINESS_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: '이웃 E-uT 영어회화 구미점',
  image: OG_IMAGE,
  '@id': SITE_URL,
  url: SITE_URL,
  telephone: '010-XXXX-XXXX',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '구미시 OO동 OO길',
    addressLocality: 'Gumi',
    addressRegion: 'Gyeongsangbuk-do',
    postalCode: 'XXXXX',
    addressCountry: 'KR',
  },
  description: '구미 No.1 영어회화 커뮤니티 이웃 E-uT. 소규모 테이블에서 즐겁게 대화하며 진짜 실력을 키우세요.',
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Google Tag Manager */}
      <Script id="gtm-script" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-5DBCTJF3');`}
      </Script>
      {/* End Google Tag Manager */}

      <Script
        id="ld-local-business"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(LOCAL_BUSINESS_JSONLD) }}
      />

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
