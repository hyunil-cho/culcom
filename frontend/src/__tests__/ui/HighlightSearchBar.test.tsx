import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HighlightSearchBar from '@/components/ui/HighlightSearchBar';

describe('HighlightSearchBar', () => {
  const defaultProps = {
    onSearch: vi.fn(),
    matchCount: 0,
    currentIndex: -1,
    onNavigate: vi.fn(),
  };

  it('이름과 전화번호 검색 필드를 렌더링한다', () => {
    render(<HighlightSearchBar {...defaultProps} />);
    expect(screen.getByPlaceholderText('회원 이름 입력')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('번호 4자리')).toBeInTheDocument();
  });

  it('검색 버튼이 2개 (이름, 전화번호)', () => {
    render(<HighlightSearchBar {...defaultProps} />);
    const searchBtns = screen.getAllByRole('button', { name: '검색' });
    expect(searchBtns).toHaveLength(2);
  });

  it('이름 검색 버튼 클릭 시 onSearch("name", keyword) 호출', () => {
    const onSearch = vi.fn();
    render(<HighlightSearchBar {...defaultProps} onSearch={onSearch} />);
    fireEvent.change(screen.getByPlaceholderText('회원 이름 입력'), { target: { value: '홍' } });
    fireEvent.click(screen.getAllByRole('button', { name: '검색' })[0]);
    expect(onSearch).toHaveBeenCalledWith('name', '홍');
  });

  it('전화번호 검색 버튼 클릭 시 onSearch("phone", keyword) 호출', () => {
    const onSearch = vi.fn();
    render(<HighlightSearchBar {...defaultProps} onSearch={onSearch} />);
    fireEvent.change(screen.getByPlaceholderText('번호 4자리'), { target: { value: '5678' } });
    fireEvent.click(screen.getAllByRole('button', { name: '검색' })[1]);
    expect(onSearch).toHaveBeenCalledWith('phone', '5678');
  });

  it('Enter 키로 이름 검색', () => {
    const onSearch = vi.fn();
    render(<HighlightSearchBar {...defaultProps} onSearch={onSearch} />);
    const input = screen.getByPlaceholderText('회원 이름 입력');
    fireEvent.change(input, { target: { value: '김' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSearch).toHaveBeenCalledWith('name', '김');
  });

  it('matchCount > 0이면 매칭 정보와 네비게이션 버튼 표시', () => {
    render(<HighlightSearchBar {...defaultProps} matchCount={5} currentIndex={2} />);
    expect(screen.getByText('3 / 5')).toBeInTheDocument();
    expect(screen.getByText('◀ 이전')).toBeInTheDocument();
    expect(screen.getByText('다음 ▶')).toBeInTheDocument();
  });

  it('matchCount === 0이면 네비게이션 미표시', () => {
    render(<HighlightSearchBar {...defaultProps} matchCount={0} />);
    expect(screen.queryByText('◀ 이전')).not.toBeInTheDocument();
  });

  it('이전/다음 버튼 클릭 시 onNavigate 호출', () => {
    const onNavigate = vi.fn();
    render(<HighlightSearchBar {...defaultProps} matchCount={3} currentIndex={1} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('◀ 이전'));
    expect(onNavigate).toHaveBeenCalledWith(-1);
    fireEvent.click(screen.getByText('다음 ▶'));
    expect(onNavigate).toHaveBeenCalledWith(1);
  });
});
