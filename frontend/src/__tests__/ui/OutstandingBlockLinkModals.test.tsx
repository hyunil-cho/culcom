import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import type { MemberMembershipResponse } from '@/lib/api';

// ── mocks ──

const mockGetMemberships = vi.fn();
const mockMemberHistory = vi.fn();
const mockGetSenderNumbers = vi.fn();
const mockPublicLinkCreate = vi.fn();

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    memberApi: {
      ...actual.memberApi,
      getMemberships: (...args: unknown[]) => mockGetMemberships(...args),
    },
    postponementApi: {
      ...actual.postponementApi,
      memberHistory: (...args: unknown[]) => mockMemberHistory(...args),
    },
    smsEventApi: {
      ...actual.smsEventApi,
      getSenderNumbers: (...args: unknown[]) => mockGetSenderNumbers(...args),
    },
    publicLinkApi: {
      ...actual.publicLinkApi,
      create: (...args: unknown[]) => mockPublicLinkCreate(...args),
    },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn() }),
}));

// ── helpers ──

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrap(ui: React.ReactElement) {
  const qc = createTestQueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const baseMembership: MemberMembershipResponse = {
  seq: 100,
  memberSeq: 10,
  membershipSeq: 1,
  membershipName: '3개월 정기권',
  startDate: '2026-01-01',
  expiryDate: '2026-04-01',
  totalCount: 30,
  usedCount: 5,
  postponeTotal: 3,
  postponeUsed: 0,
  price: '300000',
  paymentMethod: null,
  paymentDate: null,
  status: '활성',
  transferable: true,
  transferred: false,
  changedFromSeq: null,
  changeFee: null,
  createdDate: '2026-01-01',
  paidAmount: 300000,
  outstanding: 0,
  paymentStatus: '완납',
};

// ── import components ──

let RefundLinkModal: typeof import('@/app/complex/members/components/RefundLinkModal').default;
let PostponementLinkModal: typeof import('@/app/complex/members/components/PostponementLinkModal').default;

beforeEach(async () => {
  vi.clearAllMocks();
  mockMemberHistory.mockResolvedValue({ success: true, data: [] });
  mockGetSenderNumbers.mockResolvedValue({ success: true, data: [] });
  mockPublicLinkCreate.mockResolvedValue({ success: true, data: { code: 'abc12345' } });

  const refundMod = await import('@/app/complex/members/components/RefundLinkModal');
  RefundLinkModal = refundMod.default;

  const postponeMod = await import('@/app/complex/members/components/PostponementLinkModal');
  PostponementLinkModal = postponeMod.default;
});

// ── RefundLinkModal tests ──

describe('RefundLinkModal 미납금 차단', () => {
  it('미수금이 있으면 환불 링크 생성 차단 메시지 표시', async () => {
    const msWithOutstanding = { ...baseMembership, outstanding: 100000, paymentStatus: '부분납부' as const, paidAmount: 200000 };
    mockGetMemberships.mockResolvedValue({ success: true, data: [msWithOutstanding] });

    wrap(<RefundLinkModal memberSeq={10} memberName="홍길동" memberPhone="01012345678" onClose={vi.fn()} />);

    expect(await screen.findByText('환불 요청이 불가능합니다')).toBeInTheDocument();
    expect(screen.getByText(/미수금이 남아있어/)).toBeInTheDocument();
    expect(screen.queryByText('환불 요청 URL')).not.toBeInTheDocument();
  });

  it('완납 상태면 환불 링크 정상 생성', async () => {
    mockGetMemberships.mockResolvedValue({ success: true, data: [baseMembership] });

    wrap(<RefundLinkModal memberSeq={10} memberName="홍길동" memberPhone="01012345678" onClose={vi.fn()} />);

    expect(await screen.findByText('환불 요청 URL')).toBeInTheDocument();
    expect(screen.queryByText('환불 요청이 불가능합니다')).not.toBeInTheDocument();
  });

  it('활성 멤버십이 없으면 환불 링크 생성 차단 안내 표시', async () => {
    mockGetMemberships.mockResolvedValue({ success: true, data: [] });

    wrap(<RefundLinkModal memberSeq={10} memberName="홍길동" memberPhone="01012345678" onClose={vi.fn()} />);

    expect(await screen.findByText('환불 요청이 불가능합니다')).toBeInTheDocument();
    expect(screen.getByText('활성 멤버십이 없습니다.')).toBeInTheDocument();
    expect(screen.queryByText('환불 요청 URL')).not.toBeInTheDocument();
  });
});

// ── PostponementLinkModal tests ──

describe('PostponementLinkModal 미납금 차단', () => {
  it('미수금이 있으면 연기 링크 생성 차단 메시지 표시', async () => {
    const msWithOutstanding = { ...baseMembership, outstanding: 100000, paymentStatus: '부분납부' as const, paidAmount: 200000 };
    mockGetMemberships.mockResolvedValue({ success: true, data: [msWithOutstanding] });

    wrap(<PostponementLinkModal memberSeq={10} memberName="홍길동" memberPhone="01012345678" onClose={vi.fn()} />);

    expect(await screen.findByText('연기 요청이 불가능합니다')).toBeInTheDocument();
    expect(screen.getByText(/미수금이 남아있어/)).toBeInTheDocument();
    expect(screen.queryByText('연기 요청 URL')).not.toBeInTheDocument();
  });

  it('완납 상태면 연기 링크 정상 생성', async () => {
    mockGetMemberships.mockResolvedValue({ success: true, data: [baseMembership] });

    wrap(<PostponementLinkModal memberSeq={10} memberName="홍길동" memberPhone="01012345678" onClose={vi.fn()} />);

    expect(await screen.findByText('연기 요청 URL')).toBeInTheDocument();
    expect(screen.queryByText('연기 요청이 불가능합니다')).not.toBeInTheDocument();
  });

  it('활성 멤버십이 없으면 연기 불가 메시지 표시', async () => {
    const expired = { ...baseMembership, status: '만료' as const };
    mockGetMemberships.mockResolvedValue({ success: true, data: [expired] });

    wrap(<PostponementLinkModal memberSeq={10} memberName="홍길동" memberPhone="01012345678" onClose={vi.fn()} />);

    expect(await screen.findByText('연기 요청이 불가능합니다')).toBeInTheDocument();
    expect(screen.getByText('사용 가능한 멤버십이 없습니다.')).toBeInTheDocument();
  });
});
