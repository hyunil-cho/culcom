/**
 * 멤버십 수정 페이지 더블-서브밋 가드 검증.
 * FormLayout의 edit 모드 버튼도 add 모드와 동일하게 useSubmitLock 훅으로 보호된다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const mockUpdate = vi.fn();
const mockGet = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ seq: '42' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    <a href={href}>{children}</a>,
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    membershipApi: {
      ...actual.membershipApi,
      update: (...args: unknown[]) => mockUpdate(...args),
      get: (...args: unknown[]) => mockGet(...args),
    },
  };
});

// useApiQuery는 초기 마운트 시 get을 호출하고 그 결과를 data로 돌려준다.
// fetcher를 바로 resolve시켜 폼이 즉시 채워지도록 한다.
beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue({
    success: true,
    data: {
      seq: 42,
      name: '기존 멤버십',
      duration: 30,
      count: 10,
      price: 100000,
      transferable: true,
      createdDate: null,
      lastUpdateDate: null,
    },
  });
});

describe('MembershipEditPage 더블-서브밋 가드 검증', () => {
  it('응답 지연 중 수정 버튼을 두 번 연속 클릭해도 update는 한 번만 호출된다', async () => {
    let resolveUpdate: (v: unknown) => void = () => {};
    const pending = new Promise((resolve) => { resolveUpdate = resolve; });
    mockUpdate.mockImplementation(() => pending);

    const { default: Page } = await import('@/app/complex/memberships/[seq]/edit/page');
    renderWithClient(<Page />);

    // get이 resolve되어 폼이 채워질 때까지 대기
    await waitFor(() => {
      const nameInput = screen.getByDisplayValue('기존 멤버십') as HTMLInputElement;
      expect(nameInput).toBeInTheDocument();
    });

    // 수정 버튼 클릭 (edit 모드 — FormLayout의 상단 액션 버튼)
    const submitBtn = screen.getByRole('button', { name: '수정' });
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    await act(async () => { await Promise.resolve(); });

    // FormLayout의 useSubmitLock 가드로 두 번째 호출이 동기적으로 차단됨
    expect(mockUpdate).toHaveBeenCalledTimes(1);

    // 처리 중 버튼은 disabled + 라벨 전환
    expect(submitBtn).toBeDisabled();
    expect(submitBtn.textContent).toContain('처리 중');

    resolveUpdate({ success: true, data: { seq: 42 } });
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
