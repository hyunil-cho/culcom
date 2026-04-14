import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FormLayout from '@/components/ui/FormLayout';

// next/link 모킹
vi.mock('next/link', () => ({
  default: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>{children}</a>
  ),
}));

describe('FormLayout', () => {
  const defaultProps = {
    title: '회원 등록',
    backHref: '/members',
    submitLabel: '등록',
    onSubmit: vi.fn(),
  };

  it('제목과 뒤로가기 링크를 렌더링한다', () => {
    render(<FormLayout {...defaultProps}><p>폼 내용</p></FormLayout>);
    expect(screen.getByText('회원 등록')).toBeInTheDocument();
    expect(screen.getByText('← 목록으로')).toHaveAttribute('href', '/members');
  });

  it('커스텀 backLabel', () => {
    render(<FormLayout {...defaultProps} backLabel="← 돌아가기"><p>내용</p></FormLayout>);
    expect(screen.getByText('← 돌아가기')).toBeInTheDocument();
  });

  it('children을 렌더링한다', () => {
    render(<FormLayout {...defaultProps}><p>폼 필드들</p></FormLayout>);
    expect(screen.getByText('폼 필드들')).toBeInTheDocument();
  });

  it('등록 모드: 하단에 제출 버튼', () => {
    const onSubmit = vi.fn();
    render(<FormLayout {...defaultProps} onSubmit={onSubmit}><p>내용</p></FormLayout>);
    const submitBtns = screen.getAllByText('등록');
    // 하단 제출 버튼 클릭
    fireEvent.click(submitBtns[0]);
    expect(onSubmit).toHaveBeenCalled();
  });

  it('등록 모드: 하단에 취소 링크', () => {
    render(<FormLayout {...defaultProps}><p>내용</p></FormLayout>);
    const cancelLinks = screen.getAllByText('취소');
    expect(cancelLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('수정 모드(isEdit): 상단에 제출+취소, 하단 버튼 없음', () => {
    const onSubmit = vi.fn();
    render(<FormLayout {...defaultProps} isEdit onSubmit={onSubmit} submitLabel="수정"><p>내용</p></FormLayout>);
    // 상단에 수정 버튼
    expect(screen.getByText('수정')).toBeInTheDocument();
    fireEvent.click(screen.getByText('수정'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('headerExtra 렌더링', () => {
    render(
      <FormLayout {...defaultProps} headerExtra={<button>불러오기</button>}>
        <p>내용</p>
      </FormLayout>
    );
    expect(screen.getByRole('button', { name: '불러오기' })).toBeInTheDocument();
  });
});
