import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModalOverlay from '@/components/ui/ModalOverlay';

describe('ModalOverlay', () => {
  it('children을 렌더링한다', () => {
    render(<ModalOverlay><p>모달 내용</p></ModalOverlay>);
    expect(screen.getByText('모달 내용')).toBeInTheDocument();
  });

  it('기본 size는 md', () => {
    const { container } = render(<ModalOverlay><p>내용</p></ModalOverlay>);
    const content = container.querySelector('.modal-content');
    expect(content?.className).toContain('size-md');
  });

  it('size="lg"', () => {
    const { container } = render(<ModalOverlay size="lg"><p>내용</p></ModalOverlay>);
    expect(container.querySelector('.modal-content')?.className).toContain('size-lg');
  });

  it('size="sm"', () => {
    const { container } = render(<ModalOverlay size="sm"><p>내용</p></ModalOverlay>);
    expect(container.querySelector('.modal-content')?.className).toContain('size-sm');
  });

  it('오버레이(배경) 클릭 시 onClose 호출', () => {
    const onClose = vi.fn();
    const { container } = render(<ModalOverlay onClose={onClose}><p>내용</p></ModalOverlay>);
    const overlay = container.querySelector('.modal-overlay')!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('내부 콘텐츠 클릭 시 onClose 호출하지 않음', () => {
    const onClose = vi.fn();
    render(<ModalOverlay onClose={onClose}><p>내용</p></ModalOverlay>);
    fireEvent.click(screen.getByText('내용'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('onClose 미제공 시 클릭해도 에러 없음', () => {
    const { container } = render(<ModalOverlay><p>내용</p></ModalOverlay>);
    const overlay = container.querySelector('.modal-overlay')!;
    expect(() => fireEvent.click(overlay)).not.toThrow();
  });

  it('추가 className 전달', () => {
    const { container } = render(<ModalOverlay className="custom-bg"><p>내용</p></ModalOverlay>);
    expect(container.querySelector('.modal-content')?.className).toContain('custom-bg');
  });
});
