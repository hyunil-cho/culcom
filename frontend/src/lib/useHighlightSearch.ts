'use client';

import { useState, useCallback } from 'react';

interface HighlightSearchConfig {
  /** 검색 대상 행 요소 선택자 (예: '.member-item', '.staff-table tbody tr') */
  rowSelector: string;
  /** 이름 검색 대상 선택자 (예: '.member-name', '.col-name') */
  nameSelector: string;
  /** 전화번호 검색 대상 선택자 (예: '.member-phone', '.col-phone') */
  phoneSelector: string;
  /** 하이라이트 CSS 클래스명 */
  highlightClass?: string;
  /** 활성 하이라이트 CSS 클래스명 */
  activeHighlightClass?: string;
}

export function useHighlightSearch(config: HighlightSearchConfig) {
  const {
    rowSelector,
    nameSelector,
    phoneSelector,
    highlightClass = 'highlight-match',
    activeHighlightClass = 'highlight-match-active',
  } = config;

  const [matchedItems, setMatchedItems] = useState<HTMLElement[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  const clearHighlights = useCallback(() => {
    document.querySelectorAll(`.${highlightClass}, .${activeHighlightClass}`).forEach(el => {
      el.classList.remove(highlightClass, activeHighlightClass);
    });
  }, [highlightClass, activeHighlightClass]);

  const performSearch = useCallback((type: 'name' | 'phone', keyword: string) => {
    clearHighlights();

    const trimmed = keyword.trim();
    if (!trimmed) return;

    const selector = type === 'name' ? nameSelector : phoneSelector;
    const rows = Array.from(document.querySelectorAll(rowSelector)) as HTMLElement[];
    const matched: HTMLElement[] = [];

    rows.forEach(row => {
      const target = row.querySelector(selector);
      if (target && target.textContent?.includes(trimmed)) {
        row.classList.add(highlightClass);
        matched.push(row);
      }
    });

    if (matched.length > 0) {
      setMatchedItems(matched);
      setCurrentMatchIndex(0);
      matched[0].classList.add(activeHighlightClass);
      matched[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setMatchedItems([]);
      setCurrentMatchIndex(-1);
      alert('검색 결과가 없습니다.');
    }
  }, [rowSelector, nameSelector, phoneSelector, highlightClass, activeHighlightClass, clearHighlights]);

  const navigateMatch = useCallback((dir: number) => {
    if (matchedItems.length === 0) return;
    matchedItems.forEach(el => el.classList.remove(activeHighlightClass));
    const next = (currentMatchIndex + dir + matchedItems.length) % matchedItems.length;
    setCurrentMatchIndex(next);
    matchedItems[next].classList.add(activeHighlightClass);
    matchedItems[next].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [matchedItems, currentMatchIndex, activeHighlightClass]);

  return {
    matchedItems,
    currentMatchIndex,
    performSearch,
    navigateMatch,
  };
}

/** 출석률에 따른 배지 CSS 클래스 반환 */
export function rateBadgeClass(pct: number): string {
  if (pct >= 80) return 'rate-high';
  if (pct >= 60) return 'rate-mid';
  return 'rate-low';
}
