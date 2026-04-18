import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import type { PostponementRequest } from '@/lib/api';

// ── mocks ──

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockList = vi.fn();
const mockUpdateStatus = vi.fn();

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    postponementApi: {
      list: (...args: unknown[]) => mockList(...args),
      updateStatus: (...args: unknown[]) => mockUpdateStatus(...args),
      reasons: vi.fn(),
      addReason: vi.fn(),
      deleteReason: vi.fn(),
      memberHistory: vi.fn(),
    },
  };
});

// ── helpers ──

const makeRequest = (overrides: Partial<PostponementRequest>): PostponementRequest => ({
  seq: 1,
  memberName: '홍길동',
  phoneNumber: '01012345678',
  startDate: '2026-05-01',
  endDate: '2026-05-15',
  reason: '개인 사정',
  status: '대기',
  adminMessage: null,
  createdDate: '2026-04-18T10:00:00',
  desiredClassName: null,
  desiredTimeSlotName: null,
  desiredStartTime: null,
  desiredEndTime: null,
  ...overrides,
});

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderPage(TestPage: React.ComponentType) {
  const qc = createTestQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <TestPage />
    </QueryClientProvider>,
  );
}

/** 행 단위 상태 변경 select (.statusSelect)를 찾아 반환. 로우 렌더 완료를 대기한다. */
async function findRowStatusSelect(container: HTMLElement): Promise<HTMLSelectElement> {
  return await waitFor(() => {
    const el = container.querySelector('select.statusSelect') as HTMLSelectElement | null;
    if (!el) throw new Error('row status select not yet rendered');
    return el;
  });
}

let PostponementsPage: React.ComponentType;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import('@/app/complex/postponements/page');
  PostponementsPage = mod.default;
});

// ── tests ──

describe('PostponementsPage — 상태 변경 보호', () => {
  it('대기 상태 행에서 승인 선택 시 AdminActionMessageModal이 열린다', async () => {
    mockList.mockResolvedValue({
      success: true,
      data: { content: [makeRequest({ seq: 1, status: '대기' })], totalPages: 1, totalElements: 1 },
    });

    const { container } = renderPage(PostponementsPage);
    const rowSelect = await findRowStatusSelect(container);
    fireEvent.change(rowSelect, { target: { value: '승인' } });

    expect(await screen.findByText('승인 메시지 입력')).toBeInTheDocument();
    expect(screen.getByText(/처리 후에는 다른 상태로 변경할 수 없습니다/)).toBeInTheDocument();
  });

  it('대기 상태 행에서 반려 선택 시 반려 사유 입력 모달이 열린다', async () => {
    mockList.mockResolvedValue({
      success: true,
      data: { content: [makeRequest({ seq: 1, status: '대기' })], totalPages: 1, totalElements: 1 },
    });

    const { container } = renderPage(PostponementsPage);
    const rowSelect = await findRowStatusSelect(container);
    fireEvent.change(rowSelect, { target: { value: '반려' } });

    expect(await screen.findByText('반려 사유 입력')).toBeInTheDocument();
  });

  it('승인 메시지 입력 후 제출하면 updateStatus가 호출된다', async () => {
    mockList.mockResolvedValue({
      success: true,
      data: { content: [makeRequest({ seq: 42, status: '대기' })], totalPages: 1, totalElements: 1 },
    });
    mockUpdateStatus.mockResolvedValue({ success: true, data: null });

    const { container } = renderPage(PostponementsPage);
    const rowSelect = await findRowStatusSelect(container);
    fireEvent.change(rowSelect, { target: { value: '승인' } });

    const textarea = await screen.findByPlaceholderText(/고객에게 전달할 메시지/);
    fireEvent.change(textarea, { target: { value: '정상 승인합니다' } });
    fireEvent.click(screen.getByText('승인 처리'));

    await waitFor(() => {
      expect(mockUpdateStatus).toHaveBeenCalledWith(42, '승인', '정상 승인합니다');
    });
  });

  it('이미 승인된 행에는 select 대신 "처리 완료" 문구가 표시된다', async () => {
    mockList.mockResolvedValue({
      success: true,
      data: { content: [makeRequest({ seq: 1, status: '승인' })], totalPages: 1, totalElements: 1 },
    });

    const { container } = renderPage(PostponementsPage);
    expect(await screen.findByText('처리 완료')).toBeInTheDocument();

    // 해당 행에는 상태 변경 select(.statusSelect)가 없어야 한다
    expect(container.querySelector('select.statusSelect')).toBeNull();
  });

  it('이미 반려된 행에도 select 대신 "처리 완료" 문구가 표시된다', async () => {
    mockList.mockResolvedValue({
      success: true,
      data: { content: [makeRequest({ seq: 1, status: '반려' })], totalPages: 1, totalElements: 1 },
    });

    const { container } = renderPage(PostponementsPage);
    expect(await screen.findByText('처리 완료')).toBeInTheDocument();
    expect(container.querySelector('select.statusSelect')).toBeNull();
  });

  it('종결 상태 행은 AdminActionMessageModal을 열지 않는다 (UI 잠금)', async () => {
    mockList.mockResolvedValue({
      success: true,
      data: { content: [makeRequest({ seq: 1, status: '승인' })], totalPages: 1, totalElements: 1 },
    });

    renderPage(PostponementsPage);
    await screen.findByText('처리 완료');

    expect(screen.queryByText('승인 메시지 입력')).not.toBeInTheDocument();
    expect(screen.queryByText('반려 사유 입력')).not.toBeInTheDocument();
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });
});
