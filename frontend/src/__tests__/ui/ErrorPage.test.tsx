import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorPage from '@/components/ErrorPage';

describe('ErrorPage', () => {
  it('에러 코드, 제목, 메시지를 표시한다', () => {
    render(<ErrorPage code="404" title="페이지를 찾을 수 없습니다" message="요청한 페이지가 존재하지 않습니다." />);
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('페이지를 찾을 수 없습니다')).toBeInTheDocument();
    expect(screen.getByText('요청한 페이지가 존재하지 않습니다.')).toBeInTheDocument();
  });

  it('detail이 있으면 상세 정보 표시', () => {
    render(<ErrorPage code="500" title="서버 오류" message="오류 발생" detail="NullPointerException at ..." />);
    expect(screen.getByText('상세 정보')).toBeInTheDocument();
    expect(screen.getByText('NullPointerException at ...')).toBeInTheDocument();
  });

  it('detail이 없으면 상세 정보 미표시', () => {
    render(<ErrorPage code="404" title="제목" message="메시지" />);
    expect(screen.queryByText('상세 정보')).not.toBeInTheDocument();
  });

  it('홈으로 링크', () => {
    render(<ErrorPage code="500" title="제목" message="메시지" />);
    expect(screen.getByText('홈으로')).toHaveAttribute('href', '/dashboard');
  });

  it('이전 페이지 버튼', () => {
    render(<ErrorPage code="403" title="제목" message="메시지" />);
    expect(screen.getByText('← 이전 페이지')).toBeInTheDocument();
  });

  it('문의 안내 문구', () => {
    render(<ErrorPage code="503" title="제목" message="메시지" />);
    expect(screen.getByText('문제가 지속되면 시스템 관리자에게 문의해주세요.')).toBeInTheDocument();
  });

  it('오류 발생 시간 표시', () => {
    render(<ErrorPage code="500" title="제목" message="메시지" />);
    expect(screen.getByText(/오류 발생 시간:/)).toBeInTheDocument();
  });
});
