import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import type { TransferInviteInfo } from '@/lib/api';

/**
 * 공개 양도 초대 페이지(/public/transfer/invite)의 전화번호 입력 정규화 검증.
 *
 * 요구사항: 사용자가 하이픈이나 공백을 섞어 입력하더라도 서버로 전송되는 전화번호는
 * 항상 숫자만 포함된 `01000000000` 형태여야 한다. (PhoneInput 컴포넌트가 입력 시점에
 * 숫자 외 문자를 제거해 state에 반영한다.)
 */

const mockGet = vi.fn<(key: string) => string | null>();

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: mockGet }),
}));

const mockGetInviteInfo = vi.fn();
const mockSubmitInvite = vi.fn();

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    publicTransferApi: {
      getByToken: vi.fn(),
      confirm: vi.fn(),
      getInviteInfo: (...args: unknown[]) => mockGetInviteInfo(...args),
      submitInvite: (...args: unknown[]) => mockSubmitInvite(...args),
    },
  };
});

const fakeInfo: TransferInviteInfo = {
  membershipName: '3개월권',
  fromMemberName: '양도자A',
  remainingCount: 26,
  expiryDate: '2026-07-01',
  transferFee: 30000,
  // 동의항목이 비어 있으면 ConsentStep의 "다음" 버튼이 바로 활성화되어 폼 단계로 진입 가능
  consentItems: [],
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

let TestPage: React.ComponentType;

function renderPage() {
  const qc = createTestQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <TestPage />
    </QueryClientProvider>,
  );
}

/** 동의 단계 → 정보 입력 단계로 진입 */
async function advanceToForm() {
  fireEvent.click(await screen.findByText('다음'));
  // 정보 입력 단계가 렌더될 때까지 대기
  await screen.findByText('정보 입력');
}

beforeEach(async () => {
  vi.clearAllMocks();
  mockGet.mockReturnValue('valid-token');
  mockGetInviteInfo.mockResolvedValue({ success: true, data: fakeInfo });
  mockSubmitInvite.mockResolvedValue({ success: true });

  const mod = await import('@/app/public/transfer/invite/page');
  TestPage = mod.default;
});

describe('PublicTransferInvitePage — 전화번호 정규화', () => {
  it('하이픈이 섞인 전화번호를 입력해도 제출 시에는 하이픈 없는 11자리 숫자로 전송된다', async () => {
    renderPage();
    await advanceToForm();

    fireEvent.change(screen.getByPlaceholderText('이름을 입력하세요'), {
      target: { value: '양수자B' },
    });
    // 사용자가 관성적으로 하이픈을 찍어도, PhoneInput 이 실시간으로 숫자만 남긴다
    fireEvent.change(screen.getByPlaceholderText('01012345678'), {
      target: { value: '010-1234-5678' },
    });
    fireEvent.click(screen.getByText('제출하기'));

    await waitFor(() => {
      expect(mockSubmitInvite).toHaveBeenCalledTimes(1);
    });
    const [, data] = mockSubmitInvite.mock.calls[0] as [string, { phoneNumber: string }];
    expect(data.phoneNumber).toBe('01012345678');
    expect(data.phoneNumber).toMatch(/^\d{11}$/);
  });

  it('공백·괄호·점이 섞여 있어도 숫자만 남긴 형태로 전송된다', async () => {
    renderPage();
    await advanceToForm();

    fireEvent.change(screen.getByPlaceholderText('이름을 입력하세요'), {
      target: { value: '양수자C' },
    });
    fireEvent.change(screen.getByPlaceholderText('01012345678'), {
      target: { value: '(010) 9876.5432 ' },
    });
    fireEvent.click(screen.getByText('제출하기'));

    await waitFor(() => expect(mockSubmitInvite).toHaveBeenCalledTimes(1));
    const [, data] = mockSubmitInvite.mock.calls[0] as [string, { phoneNumber: string }];
    expect(data.phoneNumber).toBe('01098765432');
    expect(data.phoneNumber).toMatch(/^\d{11}$/);
  });

  it('전화번호 입력에는 tel 타입과 11자리 제한 속성이 걸려 있다', async () => {
    renderPage();
    await advanceToForm();

    const phoneInput = screen.getByPlaceholderText('01012345678') as HTMLInputElement;
    expect(phoneInput.type).toBe('tel');
    expect(phoneInput.maxLength).toBe(11);
  });

  it('전화번호가 비어 있으면 제출되지 않고 에러 배너가 노출된다', async () => {
    renderPage();
    await advanceToForm();

    fireEvent.change(screen.getByPlaceholderText('이름을 입력하세요'), {
      target: { value: '양수자E' },
    });
    // 전화번호는 공란 그대로
    fireEvent.click(screen.getByText('제출하기'));

    expect(await screen.findByText('전화번호를 입력해주세요.')).toBeInTheDocument();
    expect(mockSubmitInvite).not.toHaveBeenCalled();
  });
});
