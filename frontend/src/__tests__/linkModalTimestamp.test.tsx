import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import type { MemberMembershipResponse } from '@/lib/api';
import { LINK_VALID_MS } from '@/lib/linkExpiry';

/**
 * 링크 모달(멤버십 조회/환불/연기)이 생성하는 ?d= payload 에
 * 발급 시각 `t(number, ms)` 가 포함되어 있는지 검증한다.
 */

const mockGetMemberships = vi.fn();

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
      memberHistory: vi.fn().mockResolvedValue({ success: true, data: [] }),
    },
  };
});

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  configurable: true,
});

function makeMembership(overrides: Partial<MemberMembershipResponse> = {}): MemberMembershipResponse {
  return {
    seq: 100, memberSeq: 10, membershipSeq: 1, membershipName: '3개월권',
    startDate: '2026-01-01', expiryDate: '2026-04-01',
    totalCount: 30, usedCount: 6, postponeTotal: 3, postponeUsed: 0,
    price: '300000', paymentMethod: '카드', paymentDate: '2026-01-01T10:00:00',
    status: '활성', transferable: true, transferred: false,
    changedFromSeq: null, changeFee: null,
    createdDate: '2026-01-01T10:00:00',
    paidAmount: 300000, outstanding: 0, paymentStatus: '완납',
    ...overrides,
  };
}

function createQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function renderModal(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={createQc()}>
      {ui}
    </QueryClientProvider>,
  );
}

function extractPayload(url: string): Record<string, unknown> {
  const d = new URL(url).searchParams.get('d')!;
  return JSON.parse(decodeURIComponent(atob(d))) as Record<string, unknown>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetMemberships.mockResolvedValue({ success: true, data: [makeMembership()] });
});

describe('MembershipLinkModal payload', () => {
  it('생성된 URL 에는 현재 시각 근처의 t(ms) 가 포함된다', async () => {
    const before = Date.now();
    const { default: MembershipLinkModal } = await import('@/app/complex/members/components/MembershipLinkModal');
    renderModal(<MembershipLinkModal memberSeq={10} memberName="홍길동" memberPhone="01012345678" onClose={() => {}} />);

    const urlEl = (await screen.findByDisplayValue(/\/public\/membership\?d=/)) as HTMLInputElement;
    const after = Date.now();
    const payload = extractPayload(urlEl.value);

    expect(typeof payload.t).toBe('number');
    expect(payload.t as number).toBeGreaterThanOrEqual(before);
    expect(payload.t as number).toBeLessThanOrEqual(after);
    // LINK_VALID_MS 이내의 값이어야 한다
    expect(Date.now() - (payload.t as number)).toBeLessThan(LINK_VALID_MS);
  });
});

describe('PostponementLinkModal payload', () => {
  it('생성된 URL 에는 현재 시각 근처의 t(ms) 가 포함된다', async () => {
    const before = Date.now();
    const { default: PostponementLinkModal } = await import('@/app/complex/members/components/PostponementLinkModal');
    renderModal(<PostponementLinkModal memberSeq={10} memberName="홍길동" memberPhone="01012345678" onClose={() => {}} />);

    const urlEl = (await screen.findByDisplayValue(/\/public\/postponement\?d=/)) as HTMLInputElement;
    const after = Date.now();
    const payload = extractPayload(urlEl.value);

    expect(typeof payload.t).toBe('number');
    expect(payload.t as number).toBeGreaterThanOrEqual(before);
    expect(payload.t as number).toBeLessThanOrEqual(after);
  });
});

describe('RefundLinkModal payload', () => {
  it('생성된 URL 에는 t(ms) 필드가 포함되며 기존 필드도 유지된다', async () => {
    const before = Date.now();
    const { default: RefundLinkModal } = await import('@/app/complex/members/components/RefundLinkModal');
    renderModal(<RefundLinkModal memberSeq={10} memberName="홍길동" memberPhone="01012345678" onClose={() => {}} />);

    await screen.findByText(/환불 요청 URL/);
    const urlEl = screen.getByDisplayValue(/\/public\/refund\?d=/) as HTMLInputElement;
    await waitFor(() => expect(urlEl.value).toMatch(/d=[^&]+/));
    const after = Date.now();
    const payload = extractPayload(urlEl.value);

    expect(typeof payload.t).toBe('number');
    expect(payload.t as number).toBeGreaterThanOrEqual(before);
    expect(payload.t as number).toBeLessThanOrEqual(after);
    // 기존 필드도 유지
    expect(payload.memberMembershipSeq).toBe(100);
    expect(typeof payload.refundAmount).toBe('number');
  });
});
