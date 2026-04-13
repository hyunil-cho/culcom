'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface Slide {
  src: string;
  alt: string;
  caption: string;
}

const SLIDES: Slide[] = [
  { src: '/images/r/gal-1.png', alt: '커피 채팅', caption: '☕ 사람들끼리 커피 마시며 대화' },
  { src: '/images/r/gal-2.png', alt: '나 혼자 몰입', caption: '🎧 카페에서 나 혼자 몰입하는 공간' },
  { src: '/images/r/gal-3.png', alt: '외국인 대화', caption: '🌍 외국인 친구들과 자연스러운 대화' },
  { src: '/images/r/gal-4.png', alt: 'AI 공부', caption: '🤖 AI와 함께하는 스마트 학습' },
  { src: '/images/r/gal-5.png', alt: '원형 테이블', caption: '😄 원형 테이블에서 웃으며 이야기' },
  { src: '/images/r/gal-6.png', alt: '함께 런닝', caption: '🏃 함께 달리는 E-uT 런닝 크루' },
  { src: '/images/r/gal-7.png', alt: '클라이밍', caption: '🧗 같이 도전하는 클라이밍' },
  { src: '/images/r/gal-8.png', alt: '공항 여행', caption: '✈️ E-uT 멤버들과 함께 해외로' },
  { src: '/images/r/gal-9.png', alt: '독서 모임', caption: '📚 함께 읽고 이야기하는 북클럽' },
  { src: '/images/r/gal-10.png', alt: '파티', caption: '🎉 E-uT 영어 파티 이벤트' },
  { src: '/images/r/gal-11.png', alt: '네트워킹', caption: '🤝 영어로 네트워킹하는 사람들' },
  { src: '/images/r/gal-12.png', alt: '소규모 스터디', caption: '🗣️ 소규모 테이블 스터디' },
];

export default function GalleryClient() {
  const [index, setIndex] = useState(0);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef(0);

  const goTo = (i: number) => {
    setIndex(((i % SLIDES.length) + SLIDES.length) % SLIDES.length);
  };

  const restartAutoPlay = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      setIndex(i => (i + 1) % SLIDES.length);
    }, 4000);
  };

  useEffect(() => {
    restartAutoPlay();
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) {
      goTo(index + (diff > 0 ? 1 : -1));
      restartAutoPlay();
    }
  };

  return (
    <div className="slider-wrap fade-up">
      <div
        className="slider"
        id="slider"
        style={{ transform: `translateX(-${index * 100}%)` }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {SLIDES.map((s, i) => (
          <div className="slide" key={s.src}>
            <Image
              src={s.src}
              alt={s.alt}
              fill
              sizes="(max-width: 768px) 100vw, 960px"
              style={{ objectFit: 'cover' }}
              // 첫 슬라이드만 우선 로딩, 나머지는 지연 로딩
              priority={i === 0}
              loading={i === 0 ? undefined : 'lazy'}
            />
            <div className="slide-caption">{s.caption}</div>
          </div>
        ))}
      </div>
      <button
        className="slider-btn slider-prev"
        type="button"
        aria-label="이전 슬라이드"
        onClick={() => {
          goTo(index - 1);
          restartAutoPlay();
        }}
      >
        ←
      </button>
      <button
        className="slider-btn slider-next"
        type="button"
        aria-label="다음 슬라이드"
        onClick={() => {
          goTo(index + 1);
          restartAutoPlay();
        }}
      >
        →
      </button>
      <div className="slider-dots">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`dot${i === index ? ' active' : ''}`}
            onClick={() => {
              goTo(i);
              restartAutoPlay();
            }}
            aria-label={`슬라이드 ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
