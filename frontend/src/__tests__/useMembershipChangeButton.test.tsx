import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import type { MemberMembershipResponse } from '@/lib/api';

// ── mocks ──

const mockGetMemberships = vi.fn();
const mockListMemberships = vi.fn();
const mockListTransfers = vi.fn();

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    memberApi: { ...actual.memberApi, getMemberships: (...a: unknown[]) => mockGetMemberships(...a) },
    membershipApi: { ...actual.membershipApi, list: (...a: unknown[]) => mockListMemberships(...a) },
    transferApi: {
      ...actual.transferApi,
      list: (...a: unknown[]) => mockListTransfers(...a),
      listSelectable: vi.fn().mockResolvedValue({ success: true, data: [] }),
    },
  };
});

vi.mock('@/lib/usePaymentOptions', () => ({
  usePaymentOptions: () => ({
    methods: [{ value: '현금', label: '현금' }],
    banks: [], kinds: [],
  }),
}));

// ── helpers ──

const activeMm: MemberMembershipResponse = {
  seq: 42, memberSeq: 10, membershipSeq: 100, membershipName: '10회권',
  startDate: '2026-03-01', expiryDate: '2026-05-01',
  totalCount: 10, usedCount: 3, postponeTotal: 3, postponeUsed: 0,
  price: '150000', paymentMethod: null, paymentDate: null,
  status: '활성', transferable: true, transferred: false,
  changedFromSeq: null, changeFee: null,
  createdDate: '2026-03-01T00:00:00',
  paidAmount: 150000, outstanding: 0, paymentStatus: '완납',
  payments: [],
};

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListMemberships.mockResolvedValue({ success: true, data: [] });
  mockListTransfers.mockResolvedValue({ success: true, data: [] });
});

// ── tests ──

describe('useMembership — changeButton / changeModal', () => {
  it('memberSeq 미지정(신규 등록)에서는 changeButton이 null', async () => {
    mockGetMemberships.mockResolvedValue({ success: true, data: [] });
    const { useMembership } = await import('@/app/complex/members/useMembership');
    const { result } = renderHook(() => useMembership({ memberSeq: undefined, isEdit: false }), { wrapper });
    expect(result.current.changeButton).toBeNull();
    expect(result.current.changeModal).toBeNull();
  });

  it('활성 멤버십이 있는 수정 모드에서는 changeButton이 렌더링된다', async () => {
    mockGetMemberships.mockResolvedValue({ success: true, data: [activeMm] });
    const { useMembership } = await import('@/app/complex/members/useMembership');
    const { result } = renderHook(
      () => useMembership({ memberSeq: 10, isEdit: true }),
      { wrapper });
    await waitFor(() => {
      expect(result.current.changeButton).not.toBeNull();
    });
  });

  it('활성 멤버십이 없는 (만료/환불만) 수정 모드에서는 changeButton이 null', async () => {
    mockGetMemberships.mockResolvedValue({
      success: true, data: [{ ...activeMm, status: '만료' }],
    });
    const { useMembership } = await import('@/app/complex/members/useMembership');
    const { result } = renderHook(
      () => useMembership({ memberSeq: 10, isEdit: true }),
      { wrapper });
    // 로딩 완료까지 대기
    await waitFor(() => {
      expect(mockGetMemberships).toHaveBeenCalled();
    });
    // status가 만료이므로 changeButton은 null 유지
    expect(result.current.changeButton).toBeNull();
  });
});
