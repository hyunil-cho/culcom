import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TransferMismatchModal from '@/app/complex/members/components/TransferMismatchModal';
import type { TransferRequestItem } from '@/lib/api';

const transfer: TransferRequestItem = {
  seq: 1, memberMembershipSeq: 100, membershipSeq: 10, membershipName: '10회권',
  expiryDate: '2026-07-01',
  fromMemberSeq: 50, fromMemberName: '양도자A', fromMemberPhone: '01011111111',
  status: '접수', transferFee: 30000, remainingCount: 26,
  token: 'tok', inviteToken: null,
  toCustomerSeq: 77, toCustomerName: '양수자B', toCustomerPhone: '01022222222',
  adminMessage: null, referenced: false, createdDate: '2026-04-18T10:00:00',
};

describe('TransferMismatchModal (수정 페이지 양도 진행)', () => {
  it('양도 요청의 원 회원 정보와 등록 회원 정보를 비교해 표시한다', () => {
    render(
      <TransferMismatchModal
        memberName="양수자B"
        memberPhone="01022222222"
        transfer={transfer}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('양도자A')).toBeInTheDocument();
    expect(screen.getByText('01011111111')).toBeInTheDocument();
    expect(screen.getByText('양수자B')).toBeInTheDocument();
    expect(screen.getByText('01022222222')).toBeInTheDocument();
  });

  it('진행 버튼 클릭 시 onConfirm이 호출된다', () => {
    const onConfirm = vi.fn();
    render(
      <TransferMismatchModal
        memberName="양수자B" memberPhone="01022222222"
        transfer={transfer} onConfirm={onConfirm} onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('진행'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('취소 버튼 클릭 시 onCancel이 호출된다', () => {
    const onCancel = vi.fn();
    render(
      <TransferMismatchModal
        memberName="양수자B" memberPhone="01022222222"
        transfer={transfer} onConfirm={vi.fn()} onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByText('취소'));
    expect(onCancel).toHaveBeenCalled();
  });
});
