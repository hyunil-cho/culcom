import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Spinner from '@/components/ui/Spinner';

describe('Spinner', () => {
  it('메시지 없이 렌더링', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('메시지가 있으면 텍스트 표시', () => {
    render(<Spinner message="로딩 중..." />);
    expect(screen.getByText('로딩 중...')).toBeInTheDocument();
  });

  it('메시지가 없으면 텍스트 미표시', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelectorAll('p')).toHaveLength(0);
  });
});
