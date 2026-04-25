import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import type { MemberMembershipResponse, TransferRequestItem } from '@/lib/api';

// ── mocks ──────────────────────────────────────────────────────────────────

const mockGetMemberships = vi.fn();
const mockPublicLinkCreate = vi.fn();
const mockPublicLinkCreateForTransfer = vi.fn();
const mockPostponementHistory = vi.fn();

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    memberApi: {
      ...actual.memberApi,
      getMemberships: (...args: unknown[]) => mockGetMemberships(...args),
    },
    publicLinkApi: {
      ...actual.publicLinkApi,
      create: (...args: unknown[]) => mockPublicLinkCreate(...args),
      createForTransfer: (...args: unknown[]) => mockPublicLinkCreateForTransfer(...args),
    },
    postponementApi: {
      ...actual.postponementApi,
      memberHistory: (...args: unknown[]) => mockPostponementHistory(...args),
    },
  };
});

// clipboard stub (CopyableUrlField가 호출)
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  configurable: true,
});

// ── helpers ────────────────────────────────────────────────────────────────

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

beforeEach(() => {
  vi.clearAllMocks();
  mockPostponementHistory.mockResolvedValue({ success: true, data: [] });
  mockPublicLinkCreate.mockResolvedValue({ success: true, data: { code: 'abc12345' } });
  mockPublicLinkCreateForTransfer.mockResolvedValue({
    success: true,
    data: {
      code: 'def67890',
      transferRequest: {
        seq: 1, token: 'tok-1', transferFee: 30000, remainingCount: 24,
      } as unknown as TransferRequestItem,
    },
  });
});

// ── RefundLinkModal ────────────────────────────────────────────────────────

describe('RefundLinkModal', () => {
  const importModal = () => import('@/app/complex/members/components/RefundLinkModal');

  it('활성 멤버십이 없으면 UnavailableNotice 표시, 링크 생성 UI 없음', async () => {
    mockGetMemberships.mockResolvedValue({ success: true, data: [] });
    const { default: RefundLinkModal } = await importModal();
    renderModal(<RefundLinkModal memberSeq={10} memberName="홍길동" memberPhone="010" onClose={() => {}} />);

    expect(await screen.findByText('환불 요청이 불가능합니다')).toBeInTheDocument();
    expect(screen.queryByText(/환불 요청 URL/)).not.toBeInTheDocument();
    expect(screen.queryByText('환불 금액')).not.toBeInTheDocument();
  });

  it('모든 활성 멤버십에 미수금이 있으면 UnavailableNotice 표시, 링크 생성 차단', async () => {
    mockGetMemberships.mockResolvedValue({
      success: true,
      data: [makeMembership({ seq: 100, outstanding: 50000 })],
    });
    const { default: RefundLinkModal } = await importModal();
    renderModal(<RefundLinkModal memberSeq={10} memberName="홍길동" memberPhone="010" onClose={() => {}} />);

    expect(await screen.findByText('환불 요청이 불가능합니다')).toBeInTheDocument();
    expect(screen.getByText(/미수금이 남아있어/)).toBeInTheDocument();
    expect(screen.queryByText(/환불 요청 URL/)).not.toBeInTheDocument();
    // 발급 API가 호출되어선 안 됨
    expect(mockPublicLinkCreate).not.toHaveBeenCalled();
  });

  it('미수금 있는 멤버십과 정상 멤버십 혼재 시 정상 멤버십에만 링크 생성 허용', async () => {
    mockGetMemberships.mockResolvedValue({
      success: true,
      data: [
        makeMembership({ seq: 100, membershipName: '정기권', outstanding: 0 }),
        makeMembership({ seq: 200, membershipName: '추가권', outstanding: 50000 }),
      ],
    });
    const { default: RefundLinkModal } = await importModal();
    renderModal(<RefundLinkModal memberSeq={10} memberName="홍길동" memberPhone="010" onClose={() => {}} />);

    // 환불 가능한 '정기권'만 라디오 목록에 노출
    expect(await screen.findByText('정기권')).toBeInTheDocument();
    expect(screen.queryByText('추가권')).not.toBeInTheDocument();
    // 링크 발급 API가 정상 멤버십(seq=100)에 대해 호출됨 (debounce 후)
    await waitFor(() => {
      expect(mockPublicLinkCreate).toHaveBeenCalledWith(expect.objectContaining({
        memberSeq: 10,
        kind: '환불',
        memberMembershipSeq: 100,
      }));
    });
    // 링크 UI는 표시됨
    expect(await screen.findByText(/환불 요청 URL/)).toBeInTheDocument();
  });

  it('기본 환불 금액은 결제금액 × (총-사용)/총 공식으로 계산된다 (30회 중 6회 사용 → 80%)', async () => {
    mockGetMemberships.mockResolvedValue({
      success: true,
      data: [makeMembership({ price: '300000', totalCount: 30, usedCount: 6 })],
    });
    const { default: RefundLinkModal } = await importModal();
    renderModal(<RefundLinkModal memberSeq={10} memberName="홍길동" memberPhone="010" onClose={() => {}} />);

    // 상세 패널의 계산식: 300,000원 × 24/30회 = 240,000원
    await screen.findByText('멤버십 상세 정보');
    await waitFor(() => {
      expect(screen.getAllByText(/240,000/).length).toBeGreaterThan(0);
    });
  });

  it('멤버십 상세 정보 패널에 기간·사용률·결제 금액이 표시된다', async () => {
    mockGetMemberships.mockResolvedValue({
      success: true,
      data: [makeMembership({
        price: '300000', totalCount: 30, usedCount: 6,
        startDate: '2026-01-01', expiryDate: '2026-04-01',
      })],
    });
    const { default: RefundLinkModal } = await importModal();
    renderModal(<RefundLinkModal memberSeq={10} memberName="홍길동" memberPhone="010" onClose={() => {}} />);

    await screen.findByText('멤버십 상세 정보');
    expect(screen.getByText(/2026-01-01 ~ 2026-04-01/)).toBeInTheDocument();
    expect(screen.getByText(/6\/30회/)).toBeInTheDocument();
    // 결제 금액 라벨 아래 값으로만 300,000원이 나와야 함 (여러 군데 등장하므로 getAllByText 사용)
    expect(screen.getAllByText(/300,000원/).length).toBeGreaterThan(0);
  });

  it('생성된 링크는 publicLinkApi.create 가 memberMembershipSeq 와 refundAmount 를 포함해 호출된다', async () => {
    mockGetMemberships.mockResolvedValue({
      success: true,
      data: [makeMembership({ seq: 999, price: '300000', totalCount: 30, usedCount: 6 })],
    });
    const { default: RefundLinkModal } = await importModal();
    renderModal(<RefundLinkModal memberSeq={10} memberName="홍길동" memberPhone="010" onClose={() => {}} />);

    // 환불 URL 표시까지 기다림 (debounce 300ms 후 publicLinkApi.create 호출됨)
    await screen.findByText(/환불 요청 URL/);
    expect(mockPublicLinkCreate).toHaveBeenCalledWith(expect.objectContaining({
      memberSeq: 10,
      kind: '환불',
      memberMembershipSeq: 999,
      refundAmount: 240000, // 300000 × 24/30
    }));
  });
});

// ── TransferLinkModal ──────────────────────────────────────────────────────

describe('TransferLinkModal', () => {
  const importModal = () => import('@/app/complex/members/components/TransferLinkModal');

  it('활성 멤버십이 없으면 UnavailableNotice 표시', async () => {
    mockGetMemberships.mockResolvedValue({ success: true, data: [] });
    const { default: TransferLinkModal } = await importModal();
    renderModal(<TransferLinkModal memberSeq={10} memberName="홍길동" memberPhone="010" onClose={() => {}} />);

    expect(await screen.findByText('양도 요청이 불가능합니다')).toBeInTheDocument();
    expect(screen.getByText('활성 멤버십이 없습니다.')).toBeInTheDocument();
  });

  it('모든 활성 멤버십이 양도 불가 조건이면 드롭다운 대신 UnavailableNotice 표시', async () => {
    mockGetMemberships.mockResolvedValue({
      success: true,
      data: [
        makeMembership({ seq: 100, membershipName: '미수금권', outstanding: 50000 }),
        makeMembership({ seq: 200, membershipName: '양도받은권', transferred: true }),
        makeMembership({ seq: 300, membershipName: '양도불가권', transferable: false }),
      ],
    });
    const { default: TransferLinkModal } = await importModal();
    renderModal(<TransferLinkModal memberSeq={10} memberName="홍길동" memberPhone="010" onClose={() => {}} />);

    expect(await screen.findByText('양도 요청이 불가능합니다')).toBeInTheDocument();
    // 차단되어 생성 버튼이 아예 없어야 함
    expect(screen.queryByText('양도 요청 생성')).not.toBeInTheDocument();
  });

  it('양도 가능한 멤버십만 드롭다운에 노출되고 불가 조건은 제외된다', async () => {
    mockGetMemberships.mockResolvedValue({
      success: true,
      data: [
        makeMembership({ seq: 100, membershipName: '정기권' }), // 가능
        makeMembership({ seq: 200, membershipName: '양도불가권', transferable: false }),
        makeMembership({ seq: 300, membershipName: '미수금권', outstanding: 10000 }),
      ],
    });
    const { default: TransferLinkModal } = await importModal();
    renderModal(<TransferLinkModal memberSeq={10} memberName="홍길동" memberPhone="010" onClose={() => {}} />);

    const select = await screen.findByRole('combobox');
    // '정기권' 옵션 존재, 불가 멤버십은 없음
    expect(select.innerHTML).toContain('정기권');
    expect(select.innerHTML).not.toContain('양도불가권');
    expect(select.innerHTML).not.toContain('미수금권');
  });
});

// ── PostponementLinkModal ──────────────────────────────────────────────────

describe('PostponementLinkModal', () => {
  const importModal = () => import('@/app/complex/members/components/PostponementLinkModal');

  it('모든 활성 멤버십이 연기 불가(미수금)면 UnavailableNotice 표시', async () => {
    mockGetMemberships.mockResolvedValue({
      success: true,
      data: [makeMembership({ outstanding: 30000, postponeTotal: 3, postponeUsed: 0 })],
    });
    const { default: PostponementLinkModal } = await importModal();
    renderModal(<PostponementLinkModal memberSeq={10} memberName="홍길동" memberPhone="010" onClose={() => {}} />);

    expect(await screen.findByText('연기 요청이 불가능합니다')).toBeInTheDocument();
    expect(screen.getByText(/미수금이 남아있어/)).toBeInTheDocument();
    expect(screen.queryByText(/연기 요청 URL/)).not.toBeInTheDocument();
    expect(mockPublicLinkCreate).not.toHaveBeenCalled();
  });

  it('모든 활성 멤버십의 연기 횟수가 소진되면 UnavailableNotice 표시', async () => {
    mockGetMemberships.mockResolvedValue({
      success: true,
      data: [makeMembership({ outstanding: 0, postponeTotal: 2, postponeUsed: 2 })],
    });
    const { default: PostponementLinkModal } = await importModal();
    renderModal(<PostponementLinkModal memberSeq={10} memberName="홍길동" memberPhone="010" onClose={() => {}} />);

    expect(await screen.findByText('연기 요청이 불가능합니다')).toBeInTheDocument();
    expect(screen.queryByText(/연기 요청 URL/)).not.toBeInTheDocument();
  });

  it('일부 멤버십만 연기 가능하면 링크 생성 허용', async () => {
    mockGetMemberships.mockResolvedValue({
      success: true,
      data: [
        makeMembership({ seq: 100, membershipName: '소진권', outstanding: 0, postponeTotal: 2, postponeUsed: 2 }),
        makeMembership({ seq: 200, membershipName: '가능권', outstanding: 0, postponeTotal: 3, postponeUsed: 0 }),
      ],
    });
    const { default: PostponementLinkModal } = await importModal();
    renderModal(<PostponementLinkModal memberSeq={10} memberName="홍길동" memberPhone="010" onClose={() => {}} />);

    expect(await screen.findByText(/연기 요청 URL/)).toBeInTheDocument();
    expect(screen.queryByText('연기 요청이 불가능합니다')).not.toBeInTheDocument();
    expect(mockPublicLinkCreate).toHaveBeenCalledWith(expect.objectContaining({
      memberSeq: 10, kind: '연기',
    }));
  });
});
