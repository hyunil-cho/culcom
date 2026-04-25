import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import type { MemberMembershipResponse } from '@/lib/api';

// ── mocks ──

const mockGetMemberships = vi.fn();
const mockCreate = vi.fn();

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    memberApi: { ...actual.memberApi, getMemberships: (...a: unknown[]) => mockGetMemberships(...a) },
    publicLinkApi: { ...actual.publicLinkApi, createForTransfer: (...a: unknown[]) => mockCreate(...a) },
  };
});

// ── fixtures ──

const transferable: MemberMembershipResponse = {
  seq: 42, memberSeq: 10, membershipSeq: 100, membershipName: '10회권',
  startDate: '2026-03-01', expiryDate: '2026-05-01',
  totalCount: 30, usedCount: 4, postponeTotal: 3, postponeUsed: 0,
  price: '300000', paymentMethod: null, paymentDate: null,
  status: '활성', transferable: true, transferred: false,
  changedFromSeq: null, changeFee: null,
  createdDate: '2026-03-01T00:00:00',
  paidAmount: 300000, outstanding: 0, paymentStatus: '완납',
  payments: [],
};

function renderModal() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Modal memberSeq={10} memberName="홍길동" memberPhone="01012345678" onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

let Modal: React.ComponentType<any>;

beforeEach(async () => {
  vi.clearAllMocks();
  mockGetMemberships.mockResolvedValue({ success: true, data: [transferable] });
  mockCreate.mockResolvedValue({ success: true, data: {
    code: 'abc12345',
    transferRequest: {
      ...transferable, token: 'tok', inviteToken: null, toCustomerSeq: null, toCustomerName: null,
      adminMessage: null, fromMemberSeq: 10, fromMemberName: '홍길동', fromMemberPhone: '01012345678',
      transferFee: 30000, remainingCount: 26, status: '생성',
    },
  }});
  Modal = (await import('@/app/complex/members/components/TransferLinkModal')).default;
});

// ── tests ──

describe('TransferLinkModal — 사용 이력 패널', () => {
  it('멤버십 선택 시 사용 이력 패널이 렌더링된다', async () => {
    renderModal();
    const select = await screen.findByRole('combobox');
    fireEvent.change(select, { target: { value: '42' } });
    const panel = await screen.findByTestId('transfer-usage-panel');
    expect(panel).toHaveTextContent('10회권');
    expect(panel).toHaveTextContent('4/30회');
    expect(panel).toHaveTextContent('300,000원');
    expect(panel).toHaveTextContent('2026-03-01 ~ 2026-05-01');
  });

  it('미수금이 있는 멤버십은 선택 옵션에서 제외된다 (eligibility filter)', async () => {
    mockGetMemberships.mockResolvedValue({ success: true, data: [
      { ...transferable, outstanding: 100000 },
    ]});
    renderModal();
    // 양도 가능한 멤버십이 없어 경고가 노출되고, 드롭다운은 렌더되지 않는다
    expect(await screen.findByText(/양도 가능한 멤버십이 없습니다/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).toBeNull();
  });
});

describe('TransferLinkModal — 양도비 직접 설정', () => {
  it('멤버십 선택 시 권장 양도비가 기본값으로 채워진다 (잔여 26 → 30,000)', async () => {
    renderModal();
    const select = await screen.findByRole('combobox');
    fireEvent.change(select, { target: { value: '42' } });
    await waitFor(() => {
      const feeInput = screen.getByPlaceholderText('예: 30,000') as HTMLInputElement;
      expect(feeInput.value).toBe('30,000');
    });
  });

  it('잔여 횟수 16 이하일 때 기본값 20,000', async () => {
    mockGetMemberships.mockResolvedValue({ success: true, data: [
      { ...transferable, totalCount: 20, usedCount: 4 },  // 잔여 16
    ]});
    renderModal();
    const select = await screen.findByRole('combobox');
    fireEvent.change(select, { target: { value: '42' } });
    await waitFor(() => {
      expect((screen.getByPlaceholderText('예: 30,000') as HTMLInputElement).value).toBe('20,000');
    });
  });

  it('잔여 횟수 49 이상일 때 기본값 50,000', async () => {
    mockGetMemberships.mockResolvedValue({ success: true, data: [
      { ...transferable, totalCount: 60, usedCount: 0 },  // 잔여 60
    ]});
    renderModal();
    const select = await screen.findByRole('combobox');
    fireEvent.change(select, { target: { value: '42' } });
    await waitFor(() => {
      expect((screen.getByPlaceholderText('예: 30,000') as HTMLInputElement).value).toBe('50,000');
    });
  });

  it('관리자 편집값이 양도 요청 생성 시 API로 전달된다', async () => {
    renderModal();
    const select = await screen.findByRole('combobox');
    fireEvent.change(select, { target: { value: '42' } });

    const feeInput = await screen.findByPlaceholderText('예: 30,000') as HTMLInputElement;
    // 기본값 지우고 직접 입력
    fireEvent.change(feeInput, { target: { value: '77777' } });

    fireEvent.click(screen.getByText('양도 요청 생성'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(42, 77777);
    });
  });

  it('양도비를 0으로 설정해도 생성 가능 (무료 양도)', async () => {
    renderModal();
    const select = await screen.findByRole('combobox');
    fireEvent.change(select, { target: { value: '42' } });

    const feeInput = await screen.findByPlaceholderText('예: 30,000') as HTMLInputElement;
    fireEvent.change(feeInput, { target: { value: '0' } });
    fireEvent.click(screen.getByText('양도 요청 생성'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(42, 0);
    });
  });

  it('음수 입력 시 에러가 뜨고 API는 호출되지 않는다', async () => {
    renderModal();
    const select = await screen.findByRole('combobox');
    fireEvent.change(select, { target: { value: '42' } });

    const feeInput = await screen.findByPlaceholderText('예: 30,000') as HTMLInputElement;
    fireEvent.change(feeInput, { target: { value: '-100' } });

    // 버튼이 disabled 되어있어야 함 — 클릭해도 호출 안 됨
    const btn = screen.getByText('양도 요청 생성');
    fireEvent.click(btn);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(screen.getByText(/0 이상의 숫자를 입력해주세요/)).toBeInTheDocument();
  });
});
