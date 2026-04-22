import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import type { PostponementRequest } from '@/lib/api';
import MembershipPostponementHistorySection from '@/app/complex/members/components/MembershipPostponementHistorySection';

/**
 * 회원 상세 > 연기 기록 섹션이 각 연기 건에 연결된 멤버십 이름을 함께 노출하는지 검증.
 * 한 회원이 여러 멤버십을 거쳐오며 연기를 여러 번 쓴 경우, 어느 멤버십에서 소모한 연기였는지
 * 바로 알 수 있도록 한다.
 */

const mockMemberHistory = vi.fn();

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    postponementApi: {
      list: vi.fn(),
      updateStatus: vi.fn(),
      reasons: vi.fn(),
      addReason: vi.fn(),
      deleteReason: vi.fn(),
      memberHistory: (...args: unknown[]) => mockMemberHistory(...args),
    },
  };
});

const makeItem = (overrides: Partial<PostponementRequest>): PostponementRequest => ({
  seq: 1,
  memberName: '홍길동',
  phoneNumber: '01012345678',
  membershipName: null,
  startDate: '2026-04-01',
  endDate: '2026-04-15',
  reason: '개인 사정',
  status: '승인',
  adminMessage: null,
  createdDate: '2026-03-20T10:00:00',
  desiredClassName: null,
  desiredTimeSlotName: null,
  desiredStartTime: null,
  desiredEndTime: null,
  ...overrides,
});

function renderSection() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MembershipPostponementHistorySection memberSeq={10} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MembershipPostponementHistorySection — 멤버십 이름 표시', () => {
  it('각 연기 건에 연결된 멤버십 이름이 함께 표시된다', async () => {
    mockMemberHistory.mockResolvedValue({
      success: true,
      data: [
        makeItem({ seq: 1, membershipName: '3개월 정기권' }),
        makeItem({ seq: 2, membershipName: '1개월 체험권', startDate: '2026-02-01', endDate: '2026-02-10' }),
      ],
    });
    renderSection();

    expect(await screen.findByText('3개월 정기권')).toBeInTheDocument();
    expect(screen.getByText('1개월 체험권')).toBeInTheDocument();
  });

  it('membershipName이 null이면 해당 배지는 렌더되지 않는다 (나머지 내용은 정상 표시)', async () => {
    mockMemberHistory.mockResolvedValue({
      success: true,
      data: [makeItem({ seq: 1, membershipName: null })],
    });
    renderSection();

    // 날짜 범위는 여전히 보이지만, 멤버십 배지는 존재하지 않는다
    await waitFor(() => {
      expect(screen.getByText('2026-04-01 ~ 2026-04-15')).toBeInTheDocument();
    });
    expect(screen.queryByText(/개월 정기권|체험권/)).toBeNull();
  });

  it('여러 멤버십을 사용한 이력이 있으면 모두 구분되어 표시된다', async () => {
    mockMemberHistory.mockResolvedValue({
      success: true,
      data: [
        makeItem({ seq: 1, membershipName: '프리미엄 1년권', status: '승인' }),
        makeItem({ seq: 2, membershipName: '베이직 3개월권', status: '반려' }),
        makeItem({ seq: 3, membershipName: '프리미엄 1년권', status: '대기' }),
      ],
    });
    renderSection();

    await screen.findAllByText('프리미엄 1년권');
    const premium = screen.getAllByText('프리미엄 1년권');
    const basic = screen.getAllByText('베이직 3개월권');
    expect(premium).toHaveLength(2);
    expect(basic).toHaveLength(1);
  });
});
