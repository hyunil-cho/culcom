'use client';

import { ReactNode } from 'react';

interface SearchOption {
  value: string;
  label: string;
}

interface SearchBarProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  onSearch: () => void;
  onReset?: () => void;
  /** 검색 조건 select 옵션. 없으면 select 없이 input만 표시 */
  searchOptions?: SearchOption[];
  searchType?: string;
  onSearchTypeChange?: (value: string) => void;
  placeholder?: string;
  /** 검색바 아래에 표시할 추가 액션 (예: + 추가 버튼) */
  actions?: ReactNode;
}

export default function SearchBar({
  keyword,
  onKeywordChange,
  onSearch,
  onReset,
  searchOptions,
  searchType,
  onSearchTypeChange,
  placeholder = '검색어를 입력하세요',
  actions,
}: SearchBarProps) {
  const hasSelect = searchOptions && searchOptions.length > 0;

  return (
    <div className="content-card action-bar">
      <div className="search-section">
        <div className="search-bar">
          {hasSelect && (
            <div>
              <label className="search-bar-label">검색 조건</label>
              <select
                className="search-bar-select"
                value={searchType}
                onChange={(e) => onSearchTypeChange?.(e.target.value)}
              >
                {searchOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
          <div style={{ flex: 1, maxWidth: 400 }}>
            {hasSelect && <label className="search-bar-label">검색어</label>}
            <input
              className={`search-bar-input ${!hasSelect ? 'no-select' : ''}`}
              placeholder={placeholder}
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              style={!hasSelect ? { borderLeft: '1px solid #ddd' } : undefined}
            />
          </div>
          <div className="search-bar-buttons">
            <button className="btn-search" onClick={onSearch}>검색</button>
            {keyword && onReset && (
              <button className="btn-secondary search-bar-reset" onClick={onReset}>초기화</button>
            )}
          </div>
        </div>
        {actions && (
          <div className="action-buttons" style={{ marginTop: '1rem' }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
