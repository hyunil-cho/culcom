import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// ── mocks ──────────────────────────────────────────────────────────────────

const mockResolve = vi.fn();
const mockMembershipCheck = vi.fn();
const mockPostponementSearch = vi.fn();
const mockRefundSearch = vi.fn();
const mockTransferGet = vi.fn();

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    publicLinkApi: { ...actual.publicLinkApi, resolve: (...a: unknown[]) => mockResolve(...a) },
    publicMembershipApi: { ...actual.publicMembershipApi, check: (...a: unknown[]) => mockMembershipCheck(...a) },
    publicPostponementApi: { ...actual.publicPostponementApi, searchMember: (...a: unknown[]) => mockPostponementSearch(...a) },
    publicRefundApi: { ...actual.publicRefundApi, searchMember: (...a: unknown[]) => mockRefundSearch(...a) },
    publicTransferApi: { ...actual.publicTransferApi, getByToken: (...a: unknown[]) => mockTransferGet(...a) },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

function renderRoute(code: string) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return import('@/app/public/s/[code]/page').then(({ default: Page }) =>
    render(
      <QueryClientProvider client={qc}>
        <Page params={{ code }} />
      </QueryClientProvider>,
    ),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // 기본: 회원 검색·조회는 success(data 없음) 으로 응답 — Feature 가 mount 후 추가 호출하더라도 멈추지 않게
  mockMembershipCheck.mockResolvedValue({ success: true, data: { member: null } });
  mockPostponementSearch.mockResolvedValue({ success: true, data: { members: [] } });
  mockRefundSearch.mockResolvedValue({ success: true, data: { members: [] } });
  mockTransferGet.mockResolvedValue({
    success: true,
    data: { membershipName: 'X', fromMemberName: '홍', remainingCount: 0, expiryDate: '2026-12-31', transferFee: 0, status: '생성', inviteToken: null },
  });
});

describe('/public/s/[code] kind 분기', () => {
  it('kind=멤버십 → MembershipFeature 렌더', async () => {
    mockResolve.mockResolvedValue({
      success: true,
      data: {
        kind: '멤버십', memberSeq: 10, memberName: '홍길동', memberPhone: '01012345678',
        expiresAt: '2030-01-01T00:00:00',
      },
    });
    await renderRoute('mem001');

    expect(await screen.findByText('멤버십 현황')).toBeInTheDocument();
    expect(mockMembershipCheck).toHaveBeenCalledWith('홍길동', '01012345678');
  });

  it('kind=연기 → PostponementFeature 렌더', async () => {
    mockResolve.mockResolvedValue({
      success: true,
      data: {
        kind: '연기', memberSeq: 10, memberName: '홍길동', memberPhone: '01012345678',
        expiresAt: '2030-01-01T00:00:00',
      },
    });
    await renderRoute('post01');

    expect(await screen.findByText('수업 연기 요청')).toBeInTheDocument();
    expect(mockPostponementSearch).toHaveBeenCalledWith('홍길동', '01012345678');
  });

  it('kind=환불 → RefundFeature 에 사전 멤버십·금액이 전달된다', async () => {
    mockResolve.mockResolvedValue({
      success: true,
      data: {
        kind: '환불', memberSeq: 10, memberName: '홍길동', memberPhone: '01012345678',
        memberMembershipSeq: 999, refundAmount: 240000,
        expiresAt: '2030-01-01T00:00:00',
      },
    });
    await renderRoute('ref001');

    expect(await screen.findByText('환불 요청')).toBeInTheDocument();
    expect(mockRefundSearch).toHaveBeenCalledWith('홍길동', '01012345678');
  });

  it('kind=양도 → TransferFeature 가 transferToken 으로 양도 정보 조회', async () => {
    mockResolve.mockResolvedValue({
      success: true,
      data: {
        kind: '양도', memberSeq: 10, memberName: '홍길동', memberPhone: '01012345678',
        transferToken: 'tok-xyz',
        expiresAt: '2030-01-01T00:00:00',
      },
    });
    await renderRoute('trf001');

    expect(await screen.findByText('멤버십 양도')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockTransferGet).toHaveBeenCalledWith('tok-xyz');
    });
  });

  it('resolve 실패 시 안내 카드 표시', async () => {
    mockResolve.mockResolvedValue({ success: false, message: '만료된 링크입니다.', data: null });
    await renderRoute('expired1');

    expect(await screen.findByText('만료된 링크입니다.')).toBeInTheDocument();
  });
});
