import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

const mockChangeMyPassword = vi.fn();
const mockLogout = vi.fn();
const mockPush = vi.fn();
const mockReset = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => '/my-page',
  useParams: () => ({}),
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    userApi: {
      ...actual.userApi,
      changeMyPassword: (...args: unknown[]) => mockChangeMyPassword(...args),
    },
    authApi: {
      ...actual.authApi,
      logout: (...args: unknown[]) => mockLogout(...args),
    },
  };
});

vi.mock('@/lib/store', () => ({
  useSessionStore: (selector: (s: unknown) => unknown) => selector({
    session: {
      userSeq: 1,
      userId: 'staff1',
      name: '직원',
      role: 'STAFF',
      selectedBranchSeq: 1,
      selectedBranchName: 'A',
      requirePasswordChange: false,
    },
    branches: [],
    loaded: true,
    reset: mockReset,
  }),
}));

function renderPage(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MyPage 비밀번호 변경 폼', () => {
  it('현재/새/확인 비밀번호가 모두 맞으면 changeMyPassword 를 호출한다', async () => {
    mockChangeMyPassword.mockResolvedValue({ success: true, data: null });
    const { default: MyPage } = await import('@/app/(main)/my-page/page');
    renderPage(<MyPage />);

    const inputs = screen.getAllByPlaceholderText(/비밀번호/);
    // [0] 현재, [1] 새, [2] 확인
    fireEvent.change(inputs[0], { target: { value: 'old-pw' } });
    fireEvent.change(inputs[1], { target: { value: 'new-pw' } });
    fireEvent.change(inputs[2], { target: { value: 'new-pw' } });

    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    await waitFor(() => {
      expect(mockChangeMyPassword).toHaveBeenCalledWith({
        currentPassword: 'old-pw',
        newPassword: 'new-pw',
      });
    });
  });

  it('새 비밀번호와 확인이 일치하지 않으면 에러 배너를 표시하고 API 미호출', async () => {
    const { default: MyPage } = await import('@/app/(main)/my-page/page');
    renderPage(<MyPage />);

    const inputs = screen.getAllByPlaceholderText(/비밀번호/);
    fireEvent.change(inputs[0], { target: { value: 'old-pw' } });
    fireEvent.change(inputs[1], { target: { value: 'new-pw' } });
    fireEvent.change(inputs[2], { target: { value: 'different' } });

    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    expect(await screen.findByText(/일치하지 않습니다/)).toBeInTheDocument();
    expect(mockChangeMyPassword).not.toHaveBeenCalled();
  });

  it('새 비밀번호가 현재 비밀번호와 같으면 에러', async () => {
    const { default: MyPage } = await import('@/app/(main)/my-page/page');
    renderPage(<MyPage />);

    const inputs = screen.getAllByPlaceholderText(/비밀번호/);
    fireEvent.change(inputs[0], { target: { value: 'same-pw' } });
    fireEvent.change(inputs[1], { target: { value: 'same-pw' } });
    fireEvent.change(inputs[2], { target: { value: 'same-pw' } });

    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    expect(await screen.findByText(/현재 비밀번호와 달라야/)).toBeInTheDocument();
    expect(mockChangeMyPassword).not.toHaveBeenCalled();
  });

  it('마이페이지는 로그인한 사용자의 아이디/이름을 표시한다', async () => {
    const { default: MyPage } = await import('@/app/(main)/my-page/page');
    renderPage(<MyPage />);

    expect(screen.getByDisplayValue('staff1')).toBeInTheDocument();
    // '직원' 은 이름(staff name)과 역할(STAFF 라벨)에 모두 나오므로 2개 이상이어야 한다
    expect(screen.getAllByDisplayValue('직원').length).toBeGreaterThanOrEqual(2);
  });

  it('비밀번호 변경 성공 모달의 확인 버튼을 누르면 로그아웃 후 로그인 페이지로 이동한다', async () => {
    mockChangeMyPassword.mockResolvedValue({ success: true, data: null });
    mockLogout.mockResolvedValue({ success: true, data: null });
    const { default: MyPage } = await import('@/app/(main)/my-page/page');
    renderPage(<MyPage />);

    const inputs = screen.getAllByPlaceholderText(/비밀번호/);
    fireEvent.change(inputs[0], { target: { value: 'old-pw' } });
    fireEvent.change(inputs[1], { target: { value: 'new-pw' } });
    fireEvent.change(inputs[2], { target: { value: 'new-pw' } });
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    // 성공 모달 내 확인 버튼을 클릭
    const okBtn = await screen.findByRole('button', { name: '확인' });
    fireEvent.click(okBtn);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });
    expect(mockReset).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
