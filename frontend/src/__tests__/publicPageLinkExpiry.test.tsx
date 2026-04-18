import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { LINK_VALID_MS } from '@/lib/linkExpiry';

/**
 * 공개 링크(멤버십 조회/환불/연기)의 7일 만료 처리를 페이지 단위로 검증한다.
 * - t가 포함되지 않은 기존 링크 → 유효 (하위 호환)
 * - 7일 이내 링크 → 유효하며 API 호출됨
 * - 7일 초과 링크 → 만료 메시지 노출 + API 미호출
 */

const mockPush = vi.fn();
const mockGet = vi.fn<(key: string) => string | null>();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGet }),
}));

const mockMembershipCheck = vi.fn();
const mockRefundSearchMember = vi.fn();
const mockRefundReasons = vi.fn();
const mockPostponementSearchMember = vi.fn();

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    publicMembershipApi: {
      check: (...args: unknown[]) => mockMembershipCheck(...args),
    },
    publicRefundApi: {
      searchMember: (...args: unknown[]) => mockRefundSearchMember(...args),
      submit: vi.fn(),
      reasons: (...args: unknown[]) => mockRefundReasons(...args),
    },
    publicPostponementApi: {
      searchMember: (...args: unknown[]) => mockPostponementSearchMember(...args),
      submit: vi.fn(),
      reasons: vi.fn(),
    },
  };
});

function encodeParam(data: object) {
  return btoa(encodeURIComponent(JSON.stringify(data)));
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderWithQuery(Comp: React.ComponentType) {
  const qc = createTestQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <Comp />
    </QueryClientProvider>,
  );
}

const basePayload = { memberSeq: 10, name: '홍길동', phone: '01012345678' };

beforeEach(() => {
  vi.clearAllMocks();
  mockMembershipCheck.mockResolvedValue({
    success: true,
    data: {
      member: {
        seq: 10, name: '홍길동', phoneNumber: '01012345678',
        branchSeq: 1, branchName: '강남점', level: null, memberships: [],
      },
    },
  });
  mockRefundSearchMember.mockResolvedValue({
    success: true,
    data: {
      members: [{
        seq: 10, name: '홍길동', phoneNumber: '01012345678',
        branchSeq: 1, branchName: '강남점', level: null, memberships: [], classes: [],
      }],
    },
  });
  mockRefundReasons.mockResolvedValue({ success: true, data: [] });
  mockPostponementSearchMember.mockResolvedValue({
    success: true,
    data: {
      members: [{
        seq: 10, name: '홍길동', phoneNumber: '01012345678',
        branchSeq: 1, branchName: '강남점', level: null, memberships: [], classes: [],
      }],
    },
  });
});

describe('PublicMembershipPage 링크 만료', () => {
  async function load() {
    const mod = await import('@/app/public/membership/page');
    return mod.default;
  }

  it('t가 없는 링크(구버전)는 유효로 취급되어 API가 호출된다', async () => {
    mockGet.mockReturnValue(encodeParam(basePayload));
    const Page = await load();
    renderWithQuery(Page);
    expect(await screen.findByText('홍길동')).toBeInTheDocument();
    expect(mockMembershipCheck).toHaveBeenCalledTimes(1);
  });

  it('7일 이내 발급 링크는 유효', async () => {
    mockGet.mockReturnValue(encodeParam({ ...basePayload, t: Date.now() - 60_000 }));
    const Page = await load();
    renderWithQuery(Page);
    expect(await screen.findByText('홍길동')).toBeInTheDocument();
    expect(mockMembershipCheck).toHaveBeenCalledTimes(1);
  });

  it('7일 초과 링크는 만료 메시지 노출 + API 미호출', async () => {
    mockGet.mockReturnValue(encodeParam({ ...basePayload, t: Date.now() - LINK_VALID_MS - 1000 }));
    const Page = await load();
    renderWithQuery(Page);
    expect(
      await screen.findByText('유효하지 않은 링크입니다. 관리자에게 문의해주세요.'),
    ).toBeInTheDocument();
    expect(mockMembershipCheck).not.toHaveBeenCalled();
  });
});

describe('PublicRefundPage 링크 만료', () => {
  async function load() {
    const mod = await import('@/app/public/refund/page');
    return mod.default;
  }

  it('7일 이내 링크는 유효하며 회원 검색 호출', async () => {
    mockGet.mockReturnValue(encodeParam({ ...basePayload, t: Date.now() }));
    const Page = await load();
    renderWithQuery(Page);
    expect(await screen.findByText('홍길동')).toBeInTheDocument();
    expect(mockRefundSearchMember).toHaveBeenCalledTimes(1);
  });

  it('7일 초과 링크는 만료 메시지 노출 + 회원 검색 미호출', async () => {
    mockGet.mockReturnValue(encodeParam({ ...basePayload, t: Date.now() - LINK_VALID_MS - 1000 }));
    const Page = await load();
    renderWithQuery(Page);
    expect(
      await screen.findByText('유효하지 않은 링크입니다. 관리자에게 문의해주세요.'),
    ).toBeInTheDocument();
    expect(mockRefundSearchMember).not.toHaveBeenCalled();
  });
});

describe('PublicPostponementPage 링크 만료', () => {
  async function load() {
    const mod = await import('@/app/public/postponement/page');
    return mod.default;
  }

  it('7일 이내 링크는 유효하며 회원 검색 호출', async () => {
    mockGet.mockReturnValue(encodeParam({ ...basePayload, t: Date.now() }));
    const Page = await load();
    renderWithQuery(Page);
    expect(await screen.findByText('홍길동')).toBeInTheDocument();
    expect(mockPostponementSearchMember).toHaveBeenCalledTimes(1);
  });

  it('7일 초과 링크는 만료 메시지 노출 + 회원 검색 미호출', async () => {
    mockGet.mockReturnValue(encodeParam({ ...basePayload, t: Date.now() - LINK_VALID_MS - 1000 }));
    const Page = await load();
    renderWithQuery(Page);
    expect(
      await screen.findByText('유효하지 않은 링크입니다. 관리자에게 문의해주세요.'),
    ).toBeInTheDocument();
    expect(mockPostponementSearchMember).not.toHaveBeenCalled();
  });
});
