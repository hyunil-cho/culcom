'use client';

import { useState } from 'react';
import styles from './HighlightSearchBar.module.css';

interface HighlightSearchBarProps {
  onSearch: (type: 'name' | 'phone', keyword: string) => void;
  matchCount: number;
  currentIndex: number;
  onNavigate: (dir: number) => void;
}

export default function HighlightSearchBar({
  onSearch,
  matchCount,
  currentIndex,
  onNavigate,
}: HighlightSearchBarProps) {
  const [nameKeyword, setNameKeyword] = useState('');
  const [phoneKeyword, setPhoneKeyword] = useState('');

  return (
    <div className="content-card" style={{ marginBottom: '1.5rem' }}>
      <div className={styles.bar}>
        <div className={styles.fieldGroup}>
          이름
          <input
            type="text"
            className={`form-input ${styles.input}`}
            placeholder="회원 이름 입력"
            value={nameKeyword}
            onChange={e => setNameKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch('name', nameKeyword)}
          />
          <button className="btn-search" onClick={() => onSearch('name', nameKeyword)}>검색</button>
        </div>
        <div className={styles.fieldGroup}>
          전화번호
          <input
            type="text"
            className={`form-input ${styles.input}`}
            placeholder="번호 4자리"
            value={phoneKeyword}
            onChange={e => setPhoneKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch('phone', phoneKeyword)}
          />
          <button className="btn-search" onClick={() => onSearch('phone', phoneKeyword)}>검색</button>
        </div>
        {matchCount > 0 && (
          <div className={styles.matchInfo}>
            <span>{currentIndex + 1} / {matchCount}</span>
            <div className={styles.navButtons}>
              <button onClick={() => onNavigate(-1)} className={styles.navBtn}>◀ 이전</button>
              <button onClick={() => onNavigate(1)} className={styles.navBtn}>다음 ▶</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}