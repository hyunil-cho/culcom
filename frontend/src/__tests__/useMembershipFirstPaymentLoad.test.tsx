/**
 * 회원 수정 모드 진입 시 `useMembership` 이 멤버십의 **가장 최초 결제 1건** 정보를
 * 폼에 반영하는지 검증.
 *
 * 회귀 가드:
 * - 이전에는 완납 상태에서 paymentMethod/cardDetail 이 비워졌던 버그가 있었고,
 * - 그 뒤 여러 결제가 있어도 "최초 결제" 만 노출하도록 변경됨. 추가 결제는 결제/미수금 탭 소관.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { getMemberships, membershipList, transferList } = vi.hoisted(() => ({
  getMemberships: vi.fn(),
  membershipList: vi.fn(),
  transferList: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/lib/usePaymentOptions', () => ({
  usePaymentOptions: () => ({ methods: [], banks: [], kinds: [] }),
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    memberApi: {
      ...actual.memberApi,
      getMemberships: (...args: unknown[]) => getMemberships(...args),
    },
    membershipApi: {
      ...actual.membershipApi,
      list: (...args: unknown[]) => membershipList(...args),
    },
    transferApi: {
      ...actual.transferApi,
      list: (...args: unknown[]) => transferList(...args),
    },
  };
});

import { useMembership } from '@/app/complex/members/useMembership';
import type { MemberMembershipResponse } from '@/lib/api';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const BASE_MS: MemberMembershipResponse = {
  seq: 100,
  memberSeq: 42,
  membershipSeq: 5,
  membershipName: '3개월 주2회',
  startDate: '2026-01-01',
  expiryDate: '2026-04-01',
  totalCount: 24,
  usedCount: 3,
  postponeTotal: 0,
  postponeUsed: 0,
  price: '450000',
  paymentMethod: '카드',     // ms 집계값 — 테스트에선 첫 결제 값이 우선이어야 함
  paymentDate: '2026-02-15T10:00:00',  // ms 집계값 (최초 결제보다 늦은 시점)
  status: '활성',
  transferable: true,
  transferred: false,
  changedFromSeq: null,
  changeFee: null,
  createdDate: '2026-01-01T09:00:00',
  paidAmount: 450000,
  outstanding: 0,
  paymentStatus: '완납',
};

beforeEach(() => {
  vi.clearAllMocks();
  membershipList.mockResolvedValue({ success: true, data: [] });
  transferList.mockResolvedValue({ success: true, data: { content: [], totalPages: 0, totalElements: 0, number: 0, size: 20 } });
});

describe('useMembership – 최초 결제 반영', () => {
  it('payments 배열이 여러 건일 때 paidDate 기준 가장 이른 1건만 폼에 반영한다', async () => {
    const ms: MemberMembershipResponse = {
      ...BASE_MS,
      payments: [
        // 일부러 시간 순서와 다른 순서로 넣음 — 코드가 정렬해야 함
        { seq: 3, memberMembershipSeq: 100, amount: 150000, paidDate: '2026-03-01T09:00:00',
          method: '계좌이체', kind: 'BALANCE', note: null, createdDate: '2026-03-01T09:00:00' },
        { seq: 1, memberMembershipSeq: 100, amount: 100000, paidDate: '2026-01-01T09:00:00',
          method: '현금',     kind: 'DEPOSIT', note: null, createdDate: '2026-01-01T09:00:00' },
        { seq: 2, memberMembershipSeq: 100, amount: 200000, paidDate: '2026-02-15T10:00:00',
          method: '카드',     kind: 'BALANCE', note: null, createdDate: '2026-02-15T10:00:00',
          cardDetail: {
            cardCompany: '신한', cardNumber: '12345678',
            cardApprovalDate: '2026-02-15', cardApprovalNumber: 'APPR-222',
          } },
      ],
    };
    getMemberships.mockResolvedValue({ success: true, data: [ms] });

    const { result } = renderHook(() => useMembership({ memberSeq: 42, isEdit: true }), { wrapper });

    // 최초 결제(현금, 2026-01-01)가 반영되었는지 대기
    await waitFor(() => {
      expect(result.current.form.paymentMethod).toBe('현금');
    });

    expect(result.current.form.paymentDate).toBe('2026-01-01T09:00:00');
    // 최초 결제에는 cardDetail 이 없으므로 기본값(빈 카드상세)
    expect(result.current.form.cardDetail.cardCompany).toBe('');
    expect(result.current.form.cardDetail.cardNumber).toBe('');

    // 멤버십 기본 정보도 함께 로드
    expect(result.current.form.membershipSeq).toBe('5');
    expect(result.current.form.price).toBe('450000');
    expect(result.current.form.expiryDate).toBe('2026-04-01');
    expect(result.current.form.status).toBe('활성');
  });

  it('최초 결제가 카드면 cardDetail도 그 결제의 값으로 채워진다', async () => {
    const ms: MemberMembershipResponse = {
      ...BASE_MS,
      payments: [
        { seq: 1, memberMembershipSeq: 100, amount: 450000, paidDate: '2026-01-02T09:00:00',
          method: '카드', kind: 'DEPOSIT', note: null, createdDate: '2026-01-02T09:00:00',
          cardDetail: {
            cardCompany: '국민', cardNumber: '87654321',
            cardApprovalDate: '2026-01-02', cardApprovalNumber: 'APPR-111',
          } },
        { seq: 2, memberMembershipSeq: 100, amount: 50000, paidDate: '2026-03-10T09:00:00',
          method: '현금', kind: 'ADDITIONAL', note: null, createdDate: '2026-03-10T09:00:00' },
      ],
    };
    getMemberships.mockResolvedValue({ success: true, data: [ms] });

    const { result } = renderHook(() => useMembership({ memberSeq: 42, isEdit: true }), { wrapper });

    await waitFor(() => {
      expect(result.current.form.paymentMethod).toBe('카드');
    });

    expect(result.current.form.paymentDate).toBe('2026-01-02T09:00:00');
    expect(result.current.form.cardDetail).toEqual({
      cardCompany: '국민',
      cardNumber: '87654321',
      cardApprovalDate: '2026-01-02',
      cardApprovalNumber: 'APPR-111',
    });
  });

  it('payments 배열이 없을 때는 ms 레벨의 paymentMethod/paymentDate 를 폴백으로 사용한다', async () => {
    const ms: MemberMembershipResponse = {
      ...BASE_MS,
      payments: [],
    };
    getMemberships.mockResolvedValue({ success: true, data: [ms] });

    const { result } = renderHook(() => useMembership({ memberSeq: 42, isEdit: true }), { wrapper });

    await waitFor(() => {
      expect(result.current.form.membershipSeq).toBe('5');
    });

    expect(result.current.form.paymentMethod).toBe('카드');                    // BASE_MS.paymentMethod
    expect(result.current.form.paymentDate).toBe('2026-02-15T10:00:00');       // BASE_MS.paymentDate
  });

  it('완납 상태여도 최초 결제 정보는 폼에 그대로 로드된다 (읽기 전용 노출 용도)', async () => {
    const ms: MemberMembershipResponse = {
      ...BASE_MS,
      paymentStatus: '완납',
      outstanding: 0,
      payments: [
        { seq: 1, memberMembershipSeq: 100, amount: 450000, paidDate: '2026-01-03T14:00:00',
          method: '계좌이체', kind: 'DEPOSIT', note: null, createdDate: '2026-01-03T14:00:00' },
      ],
    };
    getMemberships.mockResolvedValue({ success: true, data: [ms] });

    const { result } = renderHook(() => useMembership({ memberSeq: 42, isEdit: true }), { wrapper });

    // 과거 버그: 완납 상태에서 paymentMethod/cardDetail 이 '' 로 비워졌음.
    // 이제는 항상 로드되어 locked(읽기 전용) 필드에 원본 결제 값이 노출되어야 함.
    await waitFor(() => {
      expect(result.current.form.paymentMethod).toBe('계좌이체');
    });
    expect(result.current.form.paymentDate).toBe('2026-01-03T14:00:00');
  });
});
