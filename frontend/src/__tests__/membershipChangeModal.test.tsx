import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import type { MemberMembershipResponse, Membership } from '@/lib/api';

// ── mocks ──

const mockChange = vi.fn();
const mockListProducts = vi.fn();
const mockGetMemberships = vi.fn();

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    memberApi: {
      ...actual.memberApi,
      changeMembership: (...args: unknown[]) => mockChange(...args),
      getMemberships: (...args: unknown[]) => mockGetMemberships(...args),
    },
    membershipApi: {
      ...actual.membershipApi,
      list: (...args: unknown[]) => mockListProducts(...args),
    },
  };
});

vi.mock('@/lib/usePaymentOptions', () => ({
  usePaymentOptions: () => ({
    methods: [{ value: '현금', label: '현금' }, { value: '카드', label: '카드' }],
    banks: [],
    kinds: [],
  }),
}));

vi.mock('@/lib/useCardCompanies', () => ({
  useCardCompanies: () => ({ cardCompanies: [] }),
}));

// ── helpers ──

const current: MemberMembershipResponse = {
  seq: 1, memberSeq: 10, membershipSeq: 100, membershipName: '10회권',
  startDate: '2026-03-01', expiryDate: '2026-05-01',
  totalCount: 10, usedCount: 3,
  postponeTotal: 3, postponeUsed: 0,
  price: '150000', paymentMethod: null, paymentDate: null,
  status: '활성', transferable: true, transferred: false,
  changedFromSeq: null, changeFee: null,
  createdDate: '2026-03-01T00:00:00',
  paidAmount: 150000, outstanding: 0, paymentStatus: '완납',
};

const newProduct: Membership = {
  seq: 200, name: '20회권', duration: 90, count: 20, price: 280000,
  transferable: true, createdDate: null, lastUpdateDate: null,
};

function renderWith(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

/** 상품 드롭다운에 특정 옵션이 들어올 때까지 대기 후 선택 */
async function selectNewProduct(value: string) {
  const sel = (await screen.findByLabelText('변경할 멤버십')) as HTMLSelectElement;
  await waitFor(() => {
    const hasOption = Array.from(sel.options).some(o => o.value === value);
    if (!hasOption) throw new Error('option not loaded');
  });
  fireEvent.change(sel, { target: { value } });
  // useEffect로 price가 세팅될 때까지 대기
  await waitFor(() => {
    const priceInput = screen.getByPlaceholderText('원 단위') as HTMLInputElement;
    if (!priceInput.value) throw new Error('price not populated');
  });
  return sel;
}

let Modal: React.ComponentType<any>;
let InfoModal: React.ComponentType<any>;

beforeEach(async () => {
  vi.clearAllMocks();
  mockListProducts.mockResolvedValue({ success: true, data: [newProduct] });
  mockChange.mockResolvedValue({ success: true, data: null });
  mockGetMemberships.mockResolvedValue({ success: true, data: [current] });
  Modal = (await import('@/app/complex/members/components/MembershipChangeModal')).default;
  InfoModal = (await import('@/app/complex/members/components/MembershipInfoModal')).default;
});

// ── tests ──

describe('MembershipChangeModal', () => {
  it('현재 멤버십 요약이 렌더링된다', () => {
    renderWith(<Modal memberSeq={10} current={current} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const summary = screen.getByTestId('current-mm-summary');
    expect(summary).toHaveTextContent('10회권');
    expect(summary).toHaveTextContent('150000');
    expect(summary).toHaveTextContent('3 / 10회');
    expect(summary).toHaveTextContent('잔여 7회');
  });

  it('변경할 멤버십 드롭다운에 현재 상품은 제외된다', async () => {
    renderWith(<Modal memberSeq={10} current={current} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const sel = (await screen.findByLabelText('변경할 멤버십')) as HTMLSelectElement;
    await waitFor(() => {
      const optionValues = Array.from(sel.options).map(o => o.value);
      expect(optionValues).toContain('200');
      expect(optionValues).not.toContain('100');
    });
  });

  it('자동 계산 버튼은 "신규가격 − 현재가격×(잔여/전체)"를 채운다', async () => {
    renderWith(<Modal memberSeq={10} current={current} onClose={vi.fn()} onSuccess={vi.fn()} />);
    await selectNewProduct('200');

    fireEvent.click(screen.getByText('자동 계산'));
    await waitFor(() => {
      const feeInput = screen.getByLabelText('추가 비용') as HTMLInputElement;
      // 280000 − 150000 × 7/10 = 175000
      expect(feeInput.value).toBe('175000');
    });
  });

  it('변경 확정 클릭 시 changeMembership이 올바른 payload로 호출된다', async () => {
    const onSuccess = vi.fn();
    renderWith(<Modal memberSeq={10} current={current} onClose={vi.fn()} onSuccess={onSuccess} />);
    await selectNewProduct('200');

    const feeInput = screen.getByLabelText('추가 비용') as HTMLInputElement;
    fireEvent.change(feeInput, { target: { value: '50000' } });

    fireEvent.click(screen.getByText('변경 확정'));

    await waitFor(() => {
      expect(mockChange).toHaveBeenCalledWith(10, 1, expect.objectContaining({
        newMembershipSeq: 200,
        changeFee: 50000,
      }));
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('음수 changeFee도 제출 가능하다', async () => {
    renderWith(<Modal memberSeq={10} current={current} onClose={vi.fn()} onSuccess={vi.fn()} />);
    await selectNewProduct('200');

    const feeInput = screen.getByLabelText('추가 비용') as HTMLInputElement;
    fireEvent.change(feeInput, { target: { value: '-30000' } });

    fireEvent.click(screen.getByText('변경 확정'));
    await waitFor(() => {
      expect(mockChange).toHaveBeenCalledWith(10, 1, expect.objectContaining({
        changeFee: -30000,
      }));
    });
  });

  it('신규 멤버십 미선택 상태에서는 제출 시 에러 표시', async () => {
    renderWith(<Modal memberSeq={10} current={current} onClose={vi.fn()} onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByText('변경 확정'));
    expect(await screen.findByText('변경할 멤버십을 선택해 주세요.')).toBeInTheDocument();
    expect(mockChange).not.toHaveBeenCalled();
  });

  it('비가역 경고 문구가 노출된다', () => {
    renderWith(<Modal memberSeq={10} current={current} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.getByText(/변경은 되돌릴 수 없습니다/)).toBeInTheDocument();
  });
});

describe('MembershipInfoModal', () => {
  it('변경 버튼은 InfoModal에 표시되지 않는다 (변경 트리거는 회원 수정 페이지로 이동)', async () => {
    mockGetMemberships.mockResolvedValue({ success: true, data: [{ ...current, status: '활성' }] });
    renderWith(<InfoModal memberSeq={10} memberName="홍길동" onClose={vi.fn()} />);
    await screen.findByText('10회권');
    expect(screen.queryByText('다른 멤버십으로 변경')).not.toBeInTheDocument();
    expect(screen.queryByText('멤버십 변경')).not.toBeInTheDocument();
  });
});
