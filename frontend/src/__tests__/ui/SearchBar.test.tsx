import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchBar from '@/components/ui/SearchBar';

describe('SearchBar', () => {
  const defaultProps = {
    keyword: '',
    onKeywordChange: vi.fn(),
    onSearch: vi.fn(),
  };

  it('검색 입력과 버튼을 렌더링한다', () => {
    render(<SearchBar {...defaultProps} />);
    expect(screen.getByPlaceholderText('검색어를 입력하세요')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '검색' })).toBeInTheDocument();
  });

  it('커스텀 placeholder', () => {
    render(<SearchBar {...defaultProps} placeholder="회원 검색" />);
    expect(screen.getByPlaceholderText('회원 검색')).toBeInTheDocument();
  });

  it('입력 변경 시 onKeywordChange 호출', () => {
    const onKeywordChange = vi.fn();
    render(<SearchBar {...defaultProps} onKeywordChange={onKeywordChange} />);
    fireEvent.change(screen.getByPlaceholderText('검색어를 입력하세요'), { target: { value: '홍길동' } });
    expect(onKeywordChange).toHaveBeenCalledWith('홍길동');
  });

  it('검색 버튼 클릭 시 onSearch 호출', () => {
    const onSearch = vi.fn();
    render(<SearchBar {...defaultProps} onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('button', { name: '검색' }));
    expect(onSearch).toHaveBeenCalledOnce();
  });

  it('Enter 키 입력 시 onSearch 호출', () => {
    const onSearch = vi.fn();
    render(<SearchBar {...defaultProps} onSearch={onSearch} />);
    fireEvent.keyDown(screen.getByPlaceholderText('검색어를 입력하세요'), { key: 'Enter' });
    expect(onSearch).toHaveBeenCalledOnce();
  });

  it('keyword가 있고 onReset이 있으면 초기화 버튼 표시', () => {
    const onReset = vi.fn();
    render(<SearchBar {...defaultProps} keyword="홍" onReset={onReset} />);
    const resetBtn = screen.getByRole('button', { name: '초기화' });
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('keyword가 비어있으면 초기화 버튼 미표시', () => {
    render(<SearchBar {...defaultProps} keyword="" onReset={vi.fn()} />);
    expect(screen.queryByRole('button', { name: '초기화' })).not.toBeInTheDocument();
  });

  it('searchOptions가 있으면 select 렌더링', () => {
    const options = [
      { value: 'name', label: '이름' },
      { value: 'phone', label: '전화번호' },
    ];
    render(<SearchBar {...defaultProps} searchOptions={options} searchType="name" onSearchTypeChange={vi.fn()} />);
    expect(screen.getByText('검색 조건')).toBeInTheDocument();
    expect(screen.getByText('이름')).toBeInTheDocument();
    expect(screen.getByText('전화번호')).toBeInTheDocument();
  });

  it('searchOptions가 없으면 select 미렌더링', () => {
    render(<SearchBar {...defaultProps} />);
    expect(screen.queryByText('검색 조건')).not.toBeInTheDocument();
  });

  it('actions를 렌더링한다', () => {
    render(<SearchBar {...defaultProps} actions={<button>추가</button>} />);
    expect(screen.getByRole('button', { name: '추가' })).toBeInTheDocument();
  });
});
