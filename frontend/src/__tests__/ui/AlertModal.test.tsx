import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AlertModal from '@/components/ui/AlertModal';

describe('AlertModal', () => {
  it('메시지를 표시한다', () => {
    render(<AlertModal message="저장되었습니다." />);
    expect(screen.getByText('저장되었습니다.')).toBeInTheDocument();
  });

  it('확인 버튼이 있다', () => {
    render(<AlertModal message="알림" />);
    expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument();
  });

  it('확인 클릭 시 모달이 사라진다', () => {
    const { container } = render(<AlertModal message="테스트" />);
    expect(screen.getByText('테스트')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(container.innerHTML).toBe('');
  });
});
