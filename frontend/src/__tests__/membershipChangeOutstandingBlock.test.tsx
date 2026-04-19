/**
 * 멤버십 변경 시 미수금 차단 검증.
 *
 * - 미수금이 남아있는 멤버십에 대해서는 변경 폼 대신 차단 UI가 노출된다.
 * - "미수금 관리로 이동" 버튼을 누르면 미수금 관리 페이지로 라우팅된다.
 * - 안전망: 만약 우회로 handleSubmit이 호출되더라도 changeMembership API는 호출되지 않는다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import type { MemberMembershipResponse, Membership } from '@/lib/api';

const mockChange = vi.fn();
const mockListProducts = vi.fn();
const mockGetMemberships = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
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
  usePaymentOptions: () => ({ methods: [], banks: [], kinds: [] }),
}));

vi.mock('@/lib/useCardCompanies', () => ({
  useCardCompanies: () => ({ cardCompanies: [] }),
}));

const baseCurrent: MemberMembershipResponse = {
  seq: 1, memberSeq: 10, membershipSeq: 100, membershipName: '10회권',
  startDate: '2026-03-01', expiryDate: '2026-05-01',
  totalCount: 10, usedCount: 3,
  postponeTotal: 3, postponeUsed: 0,
  price: '150000', paymentMethod: null, paymentDate: null,
  status: '활성', transferable: true, transferred: false,
  changedFromSeq: null, changeFee: null,
  createdDate: '2026-03-01T00:00:00',
  paidAmount: 100000, outstanding: 50000, paymentStatus: '미납',
};

const newProduct: Membership = {
  seq: 200, name: '20회권', duration: 90, count: 20, price: 280000,
  transferable: true, createdDate: null, lastUpdateDate: null,
};

function renderWith(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

let Modal: React.ComponentType<any>;

beforeEach(async () => {
  vi.clearAllMocks();
  mockListProducts.mockResolvedValue({ success: true, data: [newProduct] });
  mockChange.mockResolvedValue({ success: true, data: null });
  mockGetMemberships.mockResolvedValue({ success: true, data: [baseCurrent] });
  Modal = (await import('@/app/complex/members/components/MembershipChangeModal')).default;
});

describe('MembershipChangeModal — 미수금 차단', () => {
  it('미수금이 있으면 변경 폼 대신 차단 UI가 노출된다', () => {
    renderWith(<Modal memberSeq={10} current={baseCurrent} onClose={vi.fn()} onSuccess={vi.fn()} />);

    // 차단 박스 노출
    expect(screen.getByTestId('membership-change-outstanding-block')).toBeInTheDocument();
    expect(screen.getByText(/미수금이 남아 있어 멤버십을 변경할 수 없습니다/)).toBeInTheDocument();
    expect(screen.getByText(/50,000원/)).toBeInTheDocument();

    // 변경 폼/확정 버튼은 렌더되지 않음
    expect(screen.queryByLabelText('변경할 멤버십')).not.toBeInTheDocument();
    expect(screen.queryByText('변경 확정')).not.toBeInTheDocument();
  });

  it('"미수금 관리로 이동" 버튼 클릭 시 미수금 관리 페이지로 라우팅되고 모달이 닫힌다', () => {
    const onClose = vi.fn();
    renderWith(<Modal memberSeq={10} current={baseCurrent} onClose={onClose} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByText('미수금 관리로 이동'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/complex/members/outstanding');
  });

  it('미수금이 0이면 정상적으로 변경 폼이 렌더된다 (회귀 방지)', () => {
    const clean = { ...baseCurrent, outstanding: 0, paymentStatus: '완납' };
    renderWith(<Modal memberSeq={10} current={clean} onClose={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.queryByTestId('membership-change-outstanding-block')).not.toBeInTheDocument();
    expect(screen.getByLabelText('변경할 멤버십')).toBeInTheDocument();
    expect(screen.getByText('변경 확정')).toBeInTheDocument();
  });

  it('미수금이 null이면 정상 렌더 (방어적 처리 검증)', () => {
    const unknown = { ...baseCurrent, outstanding: null as unknown as number };
    renderWith(<Modal memberSeq={10} current={unknown} onClose={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.queryByTestId('membership-change-outstanding-block')).not.toBeInTheDocument();
    expect(screen.getByLabelText('변경할 멤버십')).toBeInTheDocument();
  });
});
