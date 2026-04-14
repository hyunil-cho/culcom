import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, LinkButton } from '@/components/ui/Button';

// next/link 모킹
vi.mock('next/link', () => ({
  default: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>{children}</a>
  ),
}));

describe('Button', () => {
  it('기본 variant는 primary', () => {
    render(<Button>등록</Button>);
    const btn = screen.getByRole('button', { name: '등록' });
    expect(btn.className).toContain('btn-primary');
  });

  it('variant="secondary"', () => {
    render(<Button variant="secondary">취소</Button>);
    expect(screen.getByRole('button').className).toContain('btn-secondary');
  });

  it('variant="danger"', () => {
    render(<Button variant="danger">삭제</Button>);
    expect(screen.getByRole('button').className).toContain('btn-danger');
  });

  it('variant="search"', () => {
    render(<Button variant="search">검색</Button>);
    expect(screen.getByRole('button').className).toContain('btn-search');
  });

  it('variant="inline"', () => {
    render(<Button variant="inline">버튼</Button>);
    expect(screen.getByRole('button').className).toContain('btn-inline');
  });

  it('inline + inlineColor="success"', () => {
    render(<Button variant="inline" inlineColor="success">성공</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('btn-inline');
    expect(btn.className).toContain('btn-inline-success');
  });

  it('size="lg"이면 large 클래스 추가', () => {
    render(<Button size="lg">큰 버튼</Button>);
    expect(screen.getByRole('button').className).toContain('btn-primary-large');
  });

  it('추가 className 전달', () => {
    render(<Button className="extra">테스트</Button>);
    expect(screen.getByRole('button').className).toContain('extra');
  });

  it('클릭 이벤트 동작', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>클릭</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('disabled 속성 전달', () => {
    render(<Button disabled>비활성</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('LinkButton', () => {
  it('href가 포함된 링크 렌더링', () => {
    render(<LinkButton href="/members">목록</LinkButton>);
    const link = screen.getByRole('link', { name: '목록' });
    expect(link).toHaveAttribute('href', '/members');
  });

  it('btn-nav 클래스 포함', () => {
    render(<LinkButton href="/test">링크</LinkButton>);
    expect(screen.getByRole('link').className).toContain('btn-nav');
  });

  it('variant 적용', () => {
    render(<LinkButton href="/test" variant="danger">삭제</LinkButton>);
    expect(screen.getByRole('link').className).toContain('btn-danger');
  });
});
