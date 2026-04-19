import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import type { MemberMembershipResponse, Membership } from '@/lib/api';

// ── mocks ──

const mockChange = vi.fn();
const mockListProducts = vi.fn();
const mockGetMemberships = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

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

const currentProduct: Membership = {
  seq: 100, name: '10회권', duration: 60, count: 10, price: 150000,
  transferable: true, createdDate: null, lastUpdateDate: null,
};

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

// 업그레이드 후보: 가격이 더 높음
const upgradeProduct: Membership = {
  seq: 200, name: '20회권', duration: 90, count: 20, price: 280000,
  transferable: true, createdDate: null, lastUpdateDate: null,
};

// 다운그레이드 후보: 가격이 더 낮음 (드롭다운에서 노출되면 안 됨)
const downgradeProduct: Membership = {
  seq: 150, name: '5회권', duration: 30, count: 5, price: 80000,
  transferable: true, createdDate: null, lastUpdateDate: null,
};

function renderWith(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

/** 드롭다운에 특정 옵션이 들어올 때까지 대기 후 선택 */
async function selectNewProduct(value: string) {
  const sel = (await screen.findByLabelText('변경할 멤버십')) as HTMLSelectElement;
  await waitFor(() => {
    const hasOption = Array.from(sel.options).some(o => o.value === value);
    if (!hasOption) throw new Error('option not loaded');
  });
  fireEvent.change(sel, { target: { value } });
  return sel;
}

let Modal: React.ComponentType<any>;
let InfoModal: React.ComponentType<any>;

beforeEach(async () => {
  vi.clearAllMocks();
  mockListProducts.mockResolvedValue({
    success: true,
    data: [currentProduct, upgradeProduct, downgradeProduct],
  });
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

  it('드롭다운에는 현재 상품과 다운그레이드 상품이 제외되고 업그레이드 후보만 노출된다', async () => {
    renderWith(<Modal memberSeq={10} current={current} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const sel = (await screen.findByLabelText('변경할 멤버십')) as HTMLSelectElement;
    await waitFor(() => {
      const optionValues = Array.from(sel.options).map(o => o.value);
      expect(optionValues).toContain('200'); // 업그레이드 (더 높은 가격) 포함
      expect(optionValues).not.toContain('100'); // 현재 상품 제외
      expect(optionValues).not.toContain('150'); // 다운그레이드 제외
    });
  });

  it('업그레이드 상품 선택 시 자동 계산 미리보기(시작일/만료일/차액)가 노출된다', async () => {
    renderWith(<Modal memberSeq={10} current={current} onClose={vi.fn()} onSuccess={vi.fn()} />);
    await selectNewProduct('200');

    const preview = await screen.findByTestId('upgrade-preview');
    // 시작일은 원본 그대로
    expect(preview).toHaveTextContent('2026-03-01');
    // 만료일은 원본 + (90-60) = 30일 연장 → 2026-05-31
    expect(preview).toHaveTextContent('2026-05-31');
    expect(preview).toHaveTextContent('+30일');
    // 차액 = 280,000 - 150,000 = 130,000
    expect(preview).toHaveTextContent('130,000원');
  });

  it('업그레이드 확정 클릭 시 newMembershipSeq만 포함한 페이로드로 API 호출된다', async () => {
    const onSuccess = vi.fn();
    renderWith(<Modal memberSeq={10} current={current} onClose={vi.fn()} onSuccess={onSuccess} />);
    await selectNewProduct('200');

    fireEvent.click(screen.getByText('업그레이드 확정'));

    await waitFor(() => {
      expect(mockChange).toHaveBeenCalledWith(10, 1, expect.objectContaining({
        newMembershipSeq: 200,
      }));
      expect(onSuccess).toHaveBeenCalled();
    });
    // 삭제된 필드들은 페이로드에 포함되지 않아야 한다
    const payload = mockChange.mock.calls[0][2];
    expect(payload).not.toHaveProperty('startDate');
    expect(payload).not.toHaveProperty('expiryDate');
    expect(payload).not.toHaveProperty('price');
    expect(payload).not.toHaveProperty('changeFee');
  });

  it('신규 멤버십 미선택 상태에서는 제출 시 에러 표시', async () => {
    renderWith(<Modal memberSeq={10} current={current} onClose={vi.fn()} onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByText('업그레이드 확정'));
    expect(await screen.findByText('변경할 멤버십을 선택해 주세요.')).toBeInTheDocument();
    expect(mockChange).not.toHaveBeenCalled();
  });

  it('업그레이드 가능한 상품이 하나도 없으면 안내 문구가 표시된다', async () => {
    // 현재 상품보다 비싼 상품이 목록에 없는 경우
    mockListProducts.mockResolvedValue({
      success: true,
      data: [currentProduct, downgradeProduct],
    });
    renderWith(<Modal memberSeq={10} current={current} onClose={vi.fn()} onSuccess={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/상위 등급.*상품이 없습니다/)).toBeInTheDocument();
    });
  });

  it('비가역 경고 문구가 노출된다', () => {
    renderWith(<Modal memberSeq={10} current={current} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.getByText(/업그레이드는 되돌릴 수 없습니다/)).toBeInTheDocument();
  });

  it('자동 계산 / 추가 비용 / 가격 / 시작일 / 만료일 입력 필드는 더 이상 존재하지 않는다', () => {
    renderWith(<Modal memberSeq={10} current={current} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.queryByText('자동 계산')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('추가 비용')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('원 단위')).not.toBeInTheDocument();
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
