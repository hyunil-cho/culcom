'use client';

import { useEffect } from 'react';

/** 원본 script.js 의 2번 블록 — .fade-up 요소들이 뷰포트에 들어오면 .visible 토글 */
export default function FadeUpObserver() {
  useEffect(() => {
    const targets = document.querySelectorAll('.fade-up');
    if (targets.length === 0) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    targets.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return null;
}
