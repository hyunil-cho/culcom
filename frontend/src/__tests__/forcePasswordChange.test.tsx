import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockReplace = vi.fn();
const mockMe = vi.fn();
const mockLogout = vi.fn();
const mockChangeMyPassword = vi.fn();
const mockReset = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
  usePathname: () => '/force-password-change',
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      me: (...args: unknown[]) => mockMe(...args),
      logout: (...args: unknown[]) => mockLogout(...args),
    },
    userApi: {
      ...actual.userApi,
      changeMyPassword: (...args: unknown[]) => mockChangeMyPassword(...args),
    },
  };
});

vi.mock('@/lib/store', () => ({
  useSessionStore: (selector: (s: unknown) => unknown) =>
    selector({ reset: mockReset }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ForcePasswordChangePage', () => {
  it('세션이 requirePasswordChange=false 이면 대시보드로 리다이렉트', async () => {
    mockMe.mockResolvedValue({
      success: true,
      data: { requirePasswordChange: false, userSeq: 1, userId: 'u', name: null, role: 'STAFF', selectedBranchSeq: 1, selectedBranchName: 'A' },
    });
    const { default: Page } = await import('@/app/(auth)/force-password-change/page');
    render(<Page />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('미인증 상태면 로그인 페이지로 리다이렉트', async () => {
    mockMe.mockResolvedValue({ success: false, data: null, message: 'unauthorized' });
    const { default: Page } = await import('@/app/(auth)/force-password-change/page');
    render(<Page />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('비밀번호 변경 성공 시 logout + reset + 로그인 페이지 이동', async () => {
    mockMe.mockResolvedValue({
      success: true,
      data: { requirePasswordChange: true, userSeq: 1, userId: 'u', name: null, role: 'STAFF', selectedBranchSeq: 1, selectedBranchName: 'A' },
    });
    mockChangeMyPassword.mockResolvedValue({ success: true, data: null });
    mockLogout.mockResolvedValue({ success: true, data: null });
    vi.useFakeTimers();

    const { default: Page } = await import('@/app/(auth)/force-password-change/page');
    render(<Page />);

    const current = screen.getByPlaceholderText('현재 비밀번호');
    const next = screen.getByPlaceholderText('새 비밀번호');
    const confirm = screen.getByPlaceholderText('새 비밀번호 확인');

    fireEvent.change(current, { target: { value: 'old' } });
    fireEvent.change(next, { target: { value: 'newpw' } });
    fireEvent.change(confirm, { target: { value: 'newpw' } });

    fireEvent.click(screen.getByRole('button', { name: /비밀번호 변경/ }));

    await vi.waitFor(() => {
      expect(mockChangeMyPassword).toHaveBeenCalledWith({
        currentPassword: 'old',
        newPassword: 'newpw',
      });
    });
    await vi.waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });
    expect(mockReset).toHaveBeenCalled();

    // setTimeout(1200ms) 경과 후 로그인으로 이동
    await vi.advanceTimersByTimeAsync(1500);
    expect(mockReplace).toHaveBeenCalledWith('/login');

    vi.useRealTimers();
  });

  it('확인 비밀번호가 일치하지 않으면 에러 표시, API 미호출', async () => {
    mockMe.mockResolvedValue({
      success: true,
      data: { requirePasswordChange: true, userSeq: 1, userId: 'u', name: null, role: 'STAFF', selectedBranchSeq: 1, selectedBranchName: 'A' },
    });
    const { default: Page } = await import('@/app/(auth)/force-password-change/page');
    render(<Page />);

    fireEvent.change(screen.getByPlaceholderText('현재 비밀번호'), { target: { value: 'old' } });
    fireEvent.change(screen.getByPlaceholderText('새 비밀번호'), { target: { value: 'newpw' } });
    fireEvent.change(screen.getByPlaceholderText('새 비밀번호 확인'), { target: { value: 'other' } });

    fireEvent.click(screen.getByRole('button', { name: /비밀번호 변경/ }));

    expect(await screen.findByText(/일치하지 않습니다/)).toBeInTheDocument();
    expect(mockChangeMyPassword).not.toHaveBeenCalled();
  });
});
