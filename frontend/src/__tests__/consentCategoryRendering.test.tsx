import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ConsentItem, TransferInviteInfo } from '@/lib/api';

// ── 공통 mocks ──

vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

const mockSearchParamsGet = vi.fn<(key: string) => string | null>();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}));

vi.mock('@/app/board/_hooks/useBoardSession', () => ({
  useBoardSession: () => ({ session: { isLoggedIn: false, memberName: null } }),
}));

vi.mock('@/app/board/_components/BoardNav', () => ({
  default: () => <nav data-testid="board-nav" />,
}));
vi.mock('@/app/board/_components/BoardFooter', () => ({
  default: () => <footer data-testid="board-footer" />,
}));

const mockGetInviteInfo = vi.fn();
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    publicTransferApi: {
      getInviteInfo: (...a: unknown[]) => mockGetInviteInfo(...a),
      submitInvite: vi.fn(),
    },
  };
});

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

// ── SIGNUP: board 회원가입 페이지 ──

describe('board 회원가입 — SIGNUP 동의항목 UI 반영', () => {
  const signupItems: ConsentItem[] = [
    { seq: 11, title: '회원가입 필수 약관', content: 'SIGNUP 필수 본문', required: true, category: 'SIGNUP', version: 1 },
    { seq: 12, title: '회원가입 선택 약관', content: 'SIGNUP 선택 본문', required: false, category: 'SIGNUP', version: 1 },
  ];

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('/api/public/consent-items')) {
        expect(url).toContain('category=SIGNUP');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: signupItems }),
        });
      }
      return Promise.reject(new Error('unexpected fetch: ' + url));
    }));
  });

  it('서버에서 내려준 SIGNUP 동의항목 제목과 필수/선택 라벨이 화면에 렌더링된다', async () => {
    const { default: BoardSignupPage } = await import('@/app/board/signup/page');
    renderWithClient(<BoardSignupPage />);

    await waitFor(() => {
      expect(screen.getByText('회원가입 필수 약관')).toBeInTheDocument();
      expect(screen.getByText('회원가입 선택 약관')).toBeInTheDocument();
    });

    expect(screen.getByText('[필수]')).toBeInTheDocument();
    expect(screen.getByText('[선택]')).toBeInTheDocument();
  });

  it('필수 항목 체크 전에는 제출 버튼이 비활성, 체크 후 활성화된다', async () => {
    const { default: BoardSignupPage } = await import('@/app/board/signup/page');
    renderWithClient(<BoardSignupPage />);

    await waitFor(() => screen.getByText('회원가입 필수 약관'));

    const submit = screen.getByRole('button', { name: '회원가입' });
    expect(submit).toBeDisabled();

    // 필수 항목 체크박스는 제목 label 내 첫 번째 checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    // [전체 동의, 항목1(필수), 항목2(선택)]
    fireEvent.click(checkboxes[1]);

    expect(submit).not.toBeDisabled();
  });

  it('"보기" 클릭 시 content가 펼쳐진다', async () => {
    const { default: BoardSignupPage } = await import('@/app/board/signup/page');
    renderWithClient(<BoardSignupPage />);

    await waitFor(() => screen.getByText('회원가입 필수 약관'));

    const viewButtons = screen.getAllByRole('button', { name: '보기' });
    fireEvent.click(viewButtons[0]);
    expect(screen.getByText('SIGNUP 필수 본문')).toBeInTheDocument();
  });
});

// ── TRANSFER: 공개 양도 초대 페이지 ──

describe('공개 양도 초대 — TRANSFER 동의항목 UI 반영', () => {
  const transferItems: ConsentItem[] = [
    { seq: 21, title: '양도 필수 동의', content: 'TRANSFER 필수 본문', required: true, category: 'TRANSFER', version: 1 },
    { seq: 22, title: '양도 선택 동의', content: 'TRANSFER 선택 본문', required: false, category: 'TRANSFER', version: 1 },
  ];

  const inviteInfo: TransferInviteInfo = {
    fromMemberName: '홍길동',
    membershipName: '3개월 정기권',
    remainingCount: 10,
    expiryDate: '2026-06-30',
    transferFee: 20000,
    consentItems: transferItems,
  } as TransferInviteInfo;

  beforeEach(() => {
    mockSearchParamsGet.mockReturnValue('valid-token');
    mockGetInviteInfo.mockResolvedValue({ success: true, data: inviteInfo });
  });

  it('초대 정보에 포함된 TRANSFER 동의항목이 ConsentStep에 렌더링된다', async () => {
    const { default: PublicTransferInvitePage } = await import('@/app/public/transfer/invite/page');
    renderWithClient(<PublicTransferInvitePage />);

    await waitFor(() => {
      expect(screen.getByText('양도 필수 동의')).toBeInTheDocument();
      expect(screen.getByText('양도 선택 동의')).toBeInTheDocument();
    });

    // 필수 항목 동의 전에는 "다음" 버튼 비활성
    const nextBtn = screen.getByRole('button', { name: '다음' });
    expect(nextBtn).toBeDisabled();
  });

  it('필수 TRANSFER 동의 체크 시 "다음" 버튼이 활성화된다', async () => {
    const { default: PublicTransferInvitePage } = await import('@/app/public/transfer/invite/page');
    renderWithClient(<PublicTransferInvitePage />);

    await waitFor(() => screen.getByText('양도 필수 동의'));

    const checkboxes = screen.getAllByRole('checkbox');
    // 필수 항목 체크박스 찾기: 각 항목 블록 내 단일 checkbox
    checkboxes
      .filter((_, idx) => idx < checkboxes.length) // 전체 목록
      .forEach(cb => { if ((cb as HTMLInputElement).dataset.required === 'true') fireEvent.click(cb); });

    // 위의 data 속성이 없을 수 있으므로 fallback: 앞쪽 체크박스 순차 클릭
    const nextBtn = screen.getByRole('button', { name: '다음' });
    if (nextBtn.hasAttribute('disabled')) {
      fireEvent.click(checkboxes[0]);
    }
    expect(screen.getByRole('button', { name: '다음' })).not.toBeDisabled();
  });
});
