'use client';

import { useEffect, useState } from 'react';

/**
 * 네비바 scroll 효과 + 햄버거 토글 + 앵커 링크 부드러운 스크롤 + 섹션별 active 하이라이트.
 * 원본 script.js 의 1/2/6/7 블록을 React 로 포팅.
 *
 * 마크업은 여기에 포함 — 페이지의 다른 섹션은 정적 SSR 이므로 네비바만 클라이언트 섬이다.
 */
export default function NavBarClient({ kakaoLoginHref }: { kakaoLoginHref: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // 스크롤 시 네비바 배경 전환 + 활성 섹션 추적
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('section[id]'));
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) setActiveId(e.target.id);
        });
      },
      { threshold: 0.4 },
    );
    sections.forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // 앵커 클릭 시 70px offset 으로 부드럽게 스크롤
  const smoothScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#') || href === '#') return;
    const el = document.querySelector(href);
    if (!el) return;
    e.preventDefault();
    const top = el.getBoundingClientRect().top + window.scrollY - 70;
    window.scrollTo({ top, behavior: 'smooth' });
    setMobileOpen(false);
  };

  const linkStyle = (id: string) => (activeId === id ? { color: '#fff' } : undefined);

  return (
    <nav id="navbar" className={scrolled ? 'scrolled' : undefined}>
      <div className="nav-inner">
        <a href="#" className="nav-logo">
          E-uT<span className="logo-dot">.</span>
        </a>
        <ul className="nav-links">
          <li>
            <a href="#why-eut" style={linkStyle('why-eut')} onClick={e => smoothScrollTo(e, '#why-eut')}>소개</a>
          </li>
          <li>
            <a href="#programs" style={linkStyle('programs')} onClick={e => smoothScrollTo(e, '#programs')}>프로그램</a>
          </li>
          <li>
            <a href="#gallery" style={linkStyle('gallery')} onClick={e => smoothScrollTo(e, '#gallery')}>공간</a>
          </li>
          <li>
            <a href="#reviews" style={linkStyle('reviews')} onClick={e => smoothScrollTo(e, '#reviews')}>후기</a>
          </li>
          <li>
            <a href="#faq" style={linkStyle('faq')} onClick={e => smoothScrollTo(e, '#faq')}>FAQ</a>
          </li>
          <li>
            <a href={kakaoLoginHref} className="nav-cta">무료 체험 신청</a>
          </li>
        </ul>
        <button
          className="hamburger"
          type="button"
          aria-label="메뉴 열기"
          onClick={() => setMobileOpen(o => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
      <div className="mobile-menu" id="mobile-menu" style={{ display: mobileOpen ? 'flex' : undefined }}>
        <a href="#why-eut" className="mobile-link" onClick={e => smoothScrollTo(e, '#why-eut')}>소개</a>
        <a href="#programs" className="mobile-link" onClick={e => smoothScrollTo(e, '#programs')}>프로그램</a>
        <a href="#gallery" className="mobile-link" onClick={e => smoothScrollTo(e, '#gallery')}>공간</a>
        <a href="#reviews" className="mobile-link" onClick={e => smoothScrollTo(e, '#reviews')}>후기</a>
        <a href="#faq" className="mobile-link" onClick={e => smoothScrollTo(e, '#faq')}>FAQ</a>
        <a href={kakaoLoginHref} className="mobile-link mobile-cta">무료 체험 신청</a>
      </div>
    </nav>
  );
}
