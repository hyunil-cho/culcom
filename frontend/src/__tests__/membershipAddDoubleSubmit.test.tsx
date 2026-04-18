/**
 * 멤버십 등록 페이지 더블-서브밋 가드 검증.
 * FormLayout이 useRef 기반 동기 잠금으로 재진입을 막는다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';

const mockCreate = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
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
      create: (...args: unknown[]) => mockCreate(...args),
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MembershipAddPage 더블-서브밋 가드 검증', () => {
  it('응답 지연 중 등록 버튼을 두 번 연속 클릭해도 create는 한 번만 호출된다', async () => {
    // 응답을 수동으로 resolve할 수 있도록 deferred 프로미스 생성
    let resolveCreate: (v: unknown) => void = () => {};
    const pending = new Promise((resolve) => { resolveCreate = resolve; });
    mockCreate.mockImplementation(() => pending);

    const { default: Page } = await import('@/app/complex/memberships/add/page');
    render(<Page />);

    const nameInput = screen.getByPlaceholderText('예: 3개월 주2회 멤버십') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '테스트 멤버십' } });

    // 응답이 오기 전 버튼을 두 번 연속 클릭
    const submitBtn = screen.getByRole('button', { name: '등록' });
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    await act(async () => { await Promise.resolve(); });

    // FormLayout의 useRef 동기 잠금으로 두 번째 호출이 차단됨
    expect(mockCreate).toHaveBeenCalledTimes(1);

    // 처리 중 버튼은 disabled + 라벨 전환
    expect(submitBtn).toBeDisabled();
    expect(submitBtn.textContent).toContain('처리 중');

    // 응답 완료 후 누수 방지
    resolveCreate({ success: true, data: { seq: 1 } });
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  it('정상 시나리오: 한 번 클릭 → create는 한 번만 호출', async () => {
    mockCreate.mockResolvedValue({ success: true, data: { seq: 1 } });

    const { default: Page } = await import('@/app/complex/memberships/add/page');
    render(<Page />);

    const nameInput = screen.getByPlaceholderText('예: 3개월 주2회 멤버십') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '테스트 멤버십' } });

    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });
});
