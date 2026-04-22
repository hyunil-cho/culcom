import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Customer } from '@/lib/api';

// ── mocks ──

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/customers',
}));

// DateTimePicker는 react-datepicker 의존이 복잡해 단순 input으로 대체
vi.mock('@/components/ui/DateTimePicker', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input
      data-testid="dtp-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

const mockList = vi.fn();
const mockProcessCall = vi.fn();
const mockCreateReservation = vi.fn();

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    customerApi: {
      ...actual.customerApi,
      list: (...args: unknown[]) => mockList(...args),
      processCall: (...args: unknown[]) => mockProcessCall(...args),
      createReservation: (...args: unknown[]) => mockCreateReservation(...args),
    },
  };
});

// ── helpers ──

const customer: Customer = {
  seq: 1,
  name: '홍길동',
  phoneNumber: '01012345678',
  callCount: 0,
  status: '신규',
  createdDate: '2026-04-20T10:00:00',
};

function renderPage(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

async function openInterviewConfirmModal() {
  // 1) CALLER 'A' 버튼 클릭 → CALLER 확인 모달 열림
  const callerA = (await screen.findAllByRole('button', { name: 'A' }))[0];
  fireEvent.click(callerA);

  // 2) CALLER 확인 모달에서 "확인" 클릭
  const callerConfirmBtn = await screen.findByRole('button', { name: '확인' });
  fireEvent.click(callerConfirmBtn);
  await waitFor(() => expect(mockProcessCall).toHaveBeenCalled());

  // 3) DateTimePicker에 일시 입력
  const dtp = await screen.findByTestId('dtp-input');
  fireEvent.change(dtp, { target: { value: '2026-04-20T10:00' } });

  // 4) 인라인 "확정" 버튼 클릭 → 인터뷰 확정 모달 열림
  const inlineConfirm = await screen.findByRole('button', { name: '확정' });
  fireEvent.click(inlineConfirm);

  // 5) 모달의 "확정" 버튼 클릭 (인라인 + 모달 둘 다 '확정'이므로 두번째 것을 선택)
  await screen.findByText('인터뷰 확정');
  const confirmButtons = screen.getAllByRole('button', { name: '확정' });
  const modalConfirmBtn = confirmButtons[confirmButtons.length - 1];
  fireEvent.click(modalConfirmBtn);
}

let CustomersPage: React.ComponentType;

beforeEach(async () => {
  vi.clearAllMocks();
  mockList.mockResolvedValue({
    success: true,
    data: { content: [customer], totalPages: 1, totalElements: 1, number: 0, size: 20 },
  });
  mockProcessCall.mockResolvedValue({
    success: true,
    data: { callCount: 1, lastUpdateDate: '2026-04-20T10:00:00' },
  });
  const mod = await import('@/app/(main)/customers/page');
  CustomersPage = mod.default;
});

// ── tests ──

describe('CustomersPage 예약 확정 SMS 경고', () => {
  it('createReservation을 toServerDateTime 변환된 일시로 호출한다', async () => {
    mockCreateReservation.mockResolvedValue({
      success: true,
      data: { reservationId: 1, customerSeq: 1, interviewDate: '2026-04-20 10:00' },
    });

    renderPage(<CustomersPage />);
    await openInterviewConfirmModal();

    await waitFor(() => {
      expect(mockCreateReservation).toHaveBeenCalledWith(1, 'A', '2026-04-20 10:00');
    });
  });

  it('smsWarning이 없으면 결과 모달에 기본 메시지만 표시된다', async () => {
    mockCreateReservation.mockResolvedValue({
      success: true,
      data: { reservationId: 1, customerSeq: 1, interviewDate: '2026-04-20 10:00' },
    });

    renderPage(<CustomersPage />);
    await openInterviewConfirmModal();

    const resultMsg = await screen.findByText('예약이 생성되었습니다.');
    expect(resultMsg).toBeInTheDocument();
    expect(screen.queryByText(/문자/)).not.toBeInTheDocument();
  });

  it('SMS 설정 미등록 경고가 있으면 결과 모달에 경고가 함께 표시된다', async () => {
    mockCreateReservation.mockResolvedValue({
      success: true,
      data: {
        reservationId: 1,
        customerSeq: 1,
        interviewDate: '2026-04-20 10:00',
        smsWarning: '문자 자동발송 설정이 등록되지 않아 발송하지 못했습니다.',
      },
    });

    renderPage(<CustomersPage />);
    await openInterviewConfirmModal();

    await waitFor(() => {
      expect(screen.getByText(/예약이 생성되었습니다\./)).toBeInTheDocument();
      expect(
        screen.getByText(/문자 자동발송 설정이 등록되지 않아 발송하지 못했습니다\./),
      ).toBeInTheDocument();
    });
  });

  it('SMS 자동발송 비활성화 경고가 있으면 결과 모달에 경고가 함께 표시된다', async () => {
    mockCreateReservation.mockResolvedValue({
      success: true,
      data: {
        reservationId: 1,
        customerSeq: 1,
        interviewDate: '2026-04-20 10:00',
        smsWarning: '문자 자동발송이 비활성화 상태입니다.',
      },
    });

    renderPage(<CustomersPage />);
    await openInterviewConfirmModal();

    await waitFor(() => {
      expect(screen.getByText(/문자 자동발송이 비활성화 상태입니다\./)).toBeInTheDocument();
    });
  });

  it('SMS 발송 실패 경고가 있으면 결과 모달에 경고가 함께 표시된다', async () => {
    mockCreateReservation.mockResolvedValue({
      success: true,
      data: {
        reservationId: 1,
        customerSeq: 1,
        interviewDate: '2026-04-20 10:00',
        smsWarning: '문자 발송 실패: 잔여 건수 부족',
      },
    });

    renderPage(<CustomersPage />);
    await openInterviewConfirmModal();

    await waitFor(() => {
      expect(screen.getByText(/문자 발송 실패: 잔여 건수 부족/)).toBeInTheDocument();
    });
  });
});
