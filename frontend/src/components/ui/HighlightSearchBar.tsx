'use client';

import { useState } from 'react';

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
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', background: '#f8f9fa',
        padding: 15, borderRadius: 8, alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 600, color: '#555' }}>
          이름
          <input
            type="text"
            className="form-input"
            placeholder="회원 이름 입력"
            value={nameKeyword}
            onChange={e => setNameKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch('name', nameKeyword)}
            style={{ padding: '8px 12px', width: 180, fontSize: '0.9rem' }}
          />
          <button className="btn-search" onClick={() => onSearch('name', nameKeyword)}>검색</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 600, color: '#555' }}>
          전화번호
          <input
            type="text"
            className="form-input"
            placeholder="번호 4자리"
            value={phoneKeyword}
            onChange={e => setPhoneKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch('phone', phoneKeyword)}
            style={{ padding: '8px 12px', width: 180, fontSize: '0.9rem' }}
          />
          <button className="btn-search" onClick={() => onSearch('phone', phoneKeyword)}>검색</button>
        </div>
        {matchCount > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, background: '#e3f2fd',
            padding: '6px 15px', borderRadius: 20, fontSize: '0.85rem', color: '#1976d2',
            fontWeight: 700, marginLeft: 'auto',
          }}>
            <span>{currentIndex + 1} / {matchCount}</span>
            <div style={{ display: 'flex', gap: 5 }}>
              <button
                onClick={() => onNavigate(-1)}
                style={{
                  background: '#fff', border: '1px solid #bbdefb', borderRadius: 4,
                  padding: '3px 10px', cursor: 'pointer', color: '#1976d2',
                  fontSize: '0.75rem', fontWeight: 600,
                }}
              >
                ◀ 이전
              </button>
              <button
                onClick={() => onNavigate(1)}
                style={{
                  background: '#fff', border: '1px solid #bbdefb', borderRadius: 4,
                  padding: '3px 10px', cursor: 'pointer', color: '#1976d2',
                  fontSize: '0.75rem', fontWeight: 600,
                }}
              >
                다음 ▶
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
