import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FormErrorBanner from '@/components/ui/FormErrorBanner';

describe('FormErrorBanner', () => {
  it('error가 null이면 아무것도 렌더링하지 않음', () => {
    const { container } = render(<FormErrorBanner error={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('error가 있으면 에러 메시지 표시', () => {
    render(<FormErrorBanner error="이름을 입력하세요." />);
    expect(screen.getByText('이름을 입력하세요.')).toBeInTheDocument();
  });

  it('에러 배경색이 빨간 계열', () => {
    render(<FormErrorBanner error="에러" />);
    const el = screen.getByText('에러');
    expect(el.style.background).toBe('rgb(254, 242, 242)');
    expect(el.style.color).toBe('rgb(220, 38, 38)');
  });
});
