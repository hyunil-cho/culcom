import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ComplexMember } from '@/lib/api';

const mockMemberList = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/complex/members',
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    memberApi: {
      ...actual.memberApi,
      list: (...args: unknown[]) => mockMemberList(...args),
    },
  };
});

vi.mock('@/app/complex/members/useMembership', () => ({
  useMembership: () => ({ openInfoModal: vi.fn(), infoModal: null }),
}));

vi.mock('@/lib/useAttendanceHistory', () => ({
  useAttendanceHistory: () => ({
    column: { header: '히스토리', render: () => null },
    modal: null,
  }),
}));

vi.mock('@/hooks/useAttendanceHistoryColumn', () => ({
  useAttendanceHistoryColumn: () => ({ header: '최근 출석기록', render: () => null }),
}));

function renderPage(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const memberWithComment = {
  seq: 1,
  name: '홍길동',
  phoneNumber: '01012345678',
  comment: '이 값은 렌더링되면 안 됨',
  info: '렌더링되는 인적사항',
} as ComplexMember;

beforeEach(() => {
  vi.clearAllMocks();
  mockMemberList.mockResolvedValue({
    success: true,
    data: {
      content: [memberWithComment],
      totalElements: 1, totalPages: 1, number: 0, size: 20,
    },
  });
});

describe('회원 관리 페이지 칼럼', () => {
  it("'특이사항' 헤더는 표시되지 않는다", async () => {
    const { default: Page } = await import('@/app/complex/members/page');
    renderPage(<Page />);

    await waitFor(() => {
      expect(screen.getByText('홍길동')).toBeInTheDocument();
    });

    expect(screen.queryByText('특이사항')).not.toBeInTheDocument();
  });

  it('comment 값이 API로 내려와도 화면에 렌더링되지 않는다', async () => {
    const { default: Page } = await import('@/app/complex/members/page');
    renderPage(<Page />);

    await waitFor(() => {
      expect(screen.getByText('홍길동')).toBeInTheDocument();
    });

    expect(screen.queryByText('이 값은 렌더링되면 안 됨')).not.toBeInTheDocument();
  });

  it('유지되는 칼럼 헤더(이름/연락처/등록일자)는 여전히 표시된다', async () => {
    const { default: Page } = await import('@/app/complex/members/page');
    renderPage(<Page />);

    await waitFor(() => {
      expect(screen.getByText('홍길동')).toBeInTheDocument();
    });

    expect(screen.getByText('이름')).toBeInTheDocument();
    expect(screen.getByText('연락처')).toBeInTheDocument();
    expect(screen.getByText('등록일자')).toBeInTheDocument();
    expect(screen.getByText('인적사항')).toBeInTheDocument();
  });
});
