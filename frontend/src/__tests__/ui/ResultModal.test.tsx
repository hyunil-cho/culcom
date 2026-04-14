import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultModal from '@/components/ui/ResultModal';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('ResultModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('성공 시 "성공" 제목과 ✓ 아이콘', () => {
    render(<ResultModal success={true} message="저장 완료" />);
    expect(screen.getByText('성공')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('저장 완료')).toBeInTheDocument();
  });

  it('실패 시 "실패" 제목과 ! 아이콘', () => {
    render(<ResultModal success={false} message="오류 발생" />);
    expect(screen.getByText('실패')).toBeInTheDocument();
    expect(screen.getByText('!')).toBeInTheDocument();
    expect(screen.getByText('오류 발생')).toBeInTheDocument();
  });

  it('확인 버튼이 있다', () => {
    render(<ResultModal success={true} message="완료" />);
    expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument();
  });

  it('redirectPath가 있으면 확인 클릭 시 router.push', () => {
    render(<ResultModal success={true} message="완료" redirectPath="/members" />);
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(mockPush).toHaveBeenCalledWith('/members');
  });

  it('onConfirm이 있으면 확인 클릭 시 onConfirm 호출', () => {
    const onConfirm = vi.fn();
    render(<ResultModal success={true} message="완료" onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('redirectPath도 onConfirm도 없으면 클릭해도 에러 없음', () => {
    render(<ResultModal success={false} message="실패" />);
    expect(() => fireEvent.click(screen.getByRole('button', { name: '확인' }))).not.toThrow();
  });
});
