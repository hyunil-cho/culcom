/**
 * PaymentAddModal 이 성공 시 MEMBERSHIP_RELATED 연관 캐시를 모두 무효화하는지 검증.
 *
 * 회귀 가드: 과거엔 호출자마다 일부 키(memberMemberships 만)를 무효화해 미수금/대시보드 등이
 * 갱신되지 않는 버그가 있었다. 이제 모달 내부에서 공통 키를 일괄 무효화한다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { invalidateQueries, addPayment } = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  addPayment: vi.fn(),
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: { invalidateQueries },
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    memberApi: {
      ...actual.memberApi,
      addPayment: (...args: unknown[]) => addPayment(...args),
    },
  };
});

vi.mock('@/lib/usePaymentOptions', () => ({
  usePaymentOptions: () => ({
    methods: [
      { value: '현금', label: '현금' },
      { value: '카드', label: '카드' },
    ],
    banks: [],
    kinds: [
      { value: 'DEPOSIT', label: '디포짓' },
      { value: 'BALANCE', label: '잔금' },
      { value: 'ADDITIONAL', label: '추가납부' },
      { value: 'REFUND', label: '환불정정' },
    ],
  }),
}));

import PaymentAddModal from '@/app/complex/members/outstanding/PaymentAddModal';
import { MEMBERSHIP_RELATED } from '@/lib/invalidate';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PaymentAddModal 캐시 무효화', () => {
  const baseProps = {
    memberSeq: 42,
    memberName: '홍길동',
    mmSeq: 7,
    membershipName: '3개월 주2회',
    outstanding: 100000,
    onClose: vi.fn(),
    onSaved: vi.fn(),
  };

  it('납부 저장 성공 시 MEMBERSHIP_RELATED 의 모든 키를 prefix 형태로 무효화한다', async () => {
    addPayment.mockResolvedValue({ success: true, data: { seq: 1 } });

    const onSaved = vi.fn();
    render(<PaymentAddModal {...baseProps} onSaved={onSaved} />);

    // 필수값: 금액 + 결제 수단 (현금)
    const amountInput = screen.getByPlaceholderText(/100,000/) as HTMLInputElement;
    fireEvent.change(amountInput, { target: { value: '50000' } });

    // 첫번째 select = 구분(kind), 두번째 select = 결제 수단(method)
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: '현금' } });

    fireEvent.click(screen.getByRole('button', { name: /납부 기록/ }));

    await waitFor(() => expect(addPayment).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());

    // MEMBERSHIP_RELATED 의 모든 키가 invalidateQueries 에 전달되었는지 확인.
    for (const key of MEMBERSHIP_RELATED) {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: [key] });
    }
    expect(invalidateQueries).toHaveBeenCalledTimes(MEMBERSHIP_RELATED.length);
  });

  it('납부 저장 실패 시 무효화와 onSaved 모두 일어나지 않는다', async () => {
    addPayment.mockResolvedValue({ success: false, message: '검증 실패' });

    const onSaved = vi.fn();
    render(<PaymentAddModal {...baseProps} onSaved={onSaved} />);

    const amountInput = screen.getByPlaceholderText(/100,000/) as HTMLInputElement;
    fireEvent.change(amountInput, { target: { value: '50000' } });
    // 첫번째 select = 구분(kind), 두번째 select = 결제 수단(method)
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: '현금' } });

    fireEvent.click(screen.getByRole('button', { name: /납부 기록/ }));

    await waitFor(() => expect(addPayment).toHaveBeenCalled());

    expect(onSaved).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
    // 에러 메시지가 모달 내부에 표시됨
    expect(await screen.findByText('검증 실패')).toBeInTheDocument();
  });
});
