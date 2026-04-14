import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmModal from '@/components/ui/ConfirmModal';

describe('ConfirmModal', () => {
  const defaultProps = {
    title: '삭제 확인',
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
  };

  it('제목과 children을 렌더링한다', () => {
    render(
      <ConfirmModal {...defaultProps}>
        <p>정말 삭제하시겠습니까?</p>
      </ConfirmModal>
    );
    expect(screen.getByText('삭제 확인')).toBeInTheDocument();
    expect(screen.getByText('정말 삭제하시겠습니까?')).toBeInTheDocument();
  });

  it('기본 확인 버튼 라벨은 "확인"', () => {
    render(<ConfirmModal {...defaultProps}><p>내용</p></ConfirmModal>);
    expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument();
  });

  it('취소 버튼이 있다', () => {
    render(<ConfirmModal {...defaultProps}><p>내용</p></ConfirmModal>);
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
  });

  it('confirmLabel 커스텀', () => {
    render(
      <ConfirmModal {...defaultProps} confirmLabel="삭제">
        <p>내용</p>
      </ConfirmModal>
    );
    expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument();
  });

  it('확인 클릭 시 onConfirm 호출', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmModal {...defaultProps} onConfirm={onConfirm}>
        <p>내용</p>
      </ConfirmModal>
    );
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('취소 클릭 시 onCancel 호출', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmModal {...defaultProps} onCancel={onCancel}>
        <p>내용</p>
      </ConfirmModal>
    );
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('confirmColor 적용', () => {
    render(
      <ConfirmModal {...defaultProps} confirmColor="#e53935">
        <p>내용</p>
      </ConfirmModal>
    );
    const confirmBtn = screen.getByRole('button', { name: '확인' });
    expect(confirmBtn.style.background).toBe('rgb(229, 57, 53)');
  });
});
