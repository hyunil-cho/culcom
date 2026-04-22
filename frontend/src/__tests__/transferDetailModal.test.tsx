import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TransferDetailModal from '@/app/complex/transfer-requests/TransferDetailModal';
import type { TransferRequestItem } from '@/lib/api';

// ── mocks ──

const mockUpdateStatus = vi.fn();

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    transferApi: {
      list: vi.fn(),
      listSelectable: vi.fn(),
      create: vi.fn(),
      updateStatus: (...args: unknown[]) => mockUpdateStatus(...args),
      complete: vi.fn(),
    },
  };
});

// ── helpers ──

const makeItem = (overrides: Partial<TransferRequestItem>): TransferRequestItem => ({
  seq: 1,
  memberMembershipSeq: 100,
  membershipSeq: 10,
  membershipName: '3개월권',
  expiryDate: '2026-07-01',
  fromMemberSeq: 1,
  fromMemberName: '홍길동',
  fromMemberPhone: '01012345678',
  status: '접수',
  transferFee: 20000,
  remainingCount: 25,
  token: 'tok',
  inviteToken: null,
  toCustomerSeq: 2,
  toCustomerName: '김철수',
  toCustomerPhone: '01098765432',
  adminMessage: null,
  referenced: false,
  createdDate: '2026-04-18T10:00:00',
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateStatus.mockResolvedValue({ success: true, data: null });
});

// "양도 확인"은 타임라인 레이블에도 중복 등장하므로 button 역할로만 찾는다.
const getConfirmButton = () => screen.getByRole('button', { name: '양도 확인' });
const queryConfirmButton = () => screen.queryByRole('button', { name: '양도 확인' });
const getRejectButton = () => screen.getByRole('button', { name: '거절' });
const queryRejectButton = () => screen.queryByRole('button', { name: '거절' });

// ── tests ──

describe('TransferDetailModal — 상태 변경 보호', () => {
  it('접수 상태에서는 거절/확인 버튼이 표시되어 상태 변경이 가능하다', () => {
    render(
      <TransferDetailModal
        item={makeItem({ status: '접수' })}
        onClose={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );
    expect(getRejectButton()).toBeInTheDocument();
    expect(getConfirmButton()).toBeInTheDocument();
  });

  it('접수 상태에서 양도 확인 클릭 시 메시지 입력 모달이 열린다', () => {
    render(
      <TransferDetailModal
        item={makeItem({ status: '접수' })}
        onClose={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );
    fireEvent.click(getConfirmButton());
    expect(screen.getByText('양도 승인 메시지 입력')).toBeInTheDocument();
  });

  it('접수 상태에서 거절 클릭 시 거절 사유 입력 모달이 열린다', () => {
    render(
      <TransferDetailModal
        item={makeItem({ status: '접수' })}
        onClose={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );
    fireEvent.click(getRejectButton());
    expect(screen.getByText('양도 거절 사유 입력')).toBeInTheDocument();
  });

  it('메시지 입력 후 제출하면 updateStatus가 호출된다', async () => {
    const onClose = vi.fn();
    const onStatusChange = vi.fn();
    render(
      <TransferDetailModal
        item={makeItem({ seq: 42, status: '접수' })}
        onClose={onClose}
        onStatusChange={onStatusChange}
      />,
    );
    fireEvent.click(getConfirmButton());
    const textarea = screen.getByPlaceholderText(/양도자·양수자에게 전달할 메시지/);
    fireEvent.change(textarea, { target: { value: '양도 완료 처리합니다' } });
    fireEvent.click(screen.getByText('양도 승인'));

    await waitFor(() => {
      expect(mockUpdateStatus).toHaveBeenCalledWith(42, '확인', '양도 완료 처리합니다');
    });
  });

  it('확인 상태에서는 거절/확인 버튼이 표시되지 않는다 (UI 잠금)', () => {
    render(
      <TransferDetailModal
        item={makeItem({ status: '확인' })}
        onClose={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );
    expect(queryRejectButton()).toBeNull();
    expect(queryConfirmButton()).toBeNull();
    expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument();
  });

  it('거절 상태에서는 거절/확인 버튼이 표시되지 않고 거절됨 배너가 노출된다', () => {
    render(
      <TransferDetailModal
        item={makeItem({ status: '거절' })}
        onClose={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );
    expect(queryConfirmButton()).toBeNull();
    expect(queryRejectButton()).toBeNull();
    expect(screen.getByText(/거절됨 — 이 양도 요청은 거절되었습니다/)).toBeInTheDocument();
  });

  it('생성 상태(양수자 미접수)에서도 관리자 액션 버튼이 표시되지 않는다', () => {
    render(
      <TransferDetailModal
        item={makeItem({ status: '생성', toCustomerName: null })}
        onClose={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );
    expect(queryConfirmButton()).toBeNull();
    expect(queryRejectButton()).toBeNull();
  });
});
