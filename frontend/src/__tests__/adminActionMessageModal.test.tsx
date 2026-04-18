import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminActionMessageModal from '@/app/complex/members/components/AdminActionMessageModal';

describe('AdminActionMessageModal', () => {
  const defaultProps = {
    title: '연기 승인 메시지 입력',
    memberName: '홍길동',
    actionLabel: '승인',
    summary: '연기 요청을',
    inputLabel: '승인 메시지',
    placeholder: '메시지를 입력해주세요',
    onCancel: vi.fn(),
    onSubmit: vi.fn(),
  };

  it('제목, 회원명, 액션 라벨이 렌더링된다', () => {
    render(<AdminActionMessageModal {...defaultProps} />);
    expect(screen.getByText('연기 승인 메시지 입력')).toBeInTheDocument();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('승인')).toBeInTheDocument();
  });

  it('빈 메시지로 제출하면 에러가 표시되고 onSubmit이 호출되지 않는다', () => {
    const onSubmit = vi.fn();
    render(<AdminActionMessageModal {...defaultProps} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('승인 처리'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('승인 메시지을(를) 입력해주세요.')).toBeInTheDocument();
  });

  it('메시지를 입력하고 제출하면 onSubmit 에 메시지가 전달된다', () => {
    const onSubmit = vi.fn();
    render(<AdminActionMessageModal {...defaultProps} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('메시지를 입력해주세요'), {
      target: { value: '정상 승인합니다' },
    });
    fireEvent.click(screen.getByText('승인 처리'));
    expect(onSubmit).toHaveBeenCalledWith('정상 승인합니다');
  });

  it('취소 버튼 클릭 시 onCancel 호출', () => {
    const onCancel = vi.fn();
    render(<AdminActionMessageModal {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('취소'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('warning prop 이 있으면 렌더링된다', () => {
    render(<AdminActionMessageModal {...defaultProps}
      warning={<div>⚠️ 되돌릴 수 없는 작업입니다</div>} />);
    expect(screen.getByText('⚠️ 되돌릴 수 없는 작업입니다')).toBeInTheDocument();
  });

  it('반려 액션은 자동으로 danger 톤, 제출 라벨은 "반려 처리"', () => {
    render(<AdminActionMessageModal {...defaultProps}
      actionLabel="반려" inputLabel="반려 사유" />);
    expect(screen.getByText('반려 처리')).toBeInTheDocument();
  });

  it('커스텀 submitLabel 이 반영된다', () => {
    render(<AdminActionMessageModal {...defaultProps}
      actionLabel="확인" submitLabel="양도 승인" />);
    expect(screen.getByText('양도 승인')).toBeInTheDocument();
  });
});
