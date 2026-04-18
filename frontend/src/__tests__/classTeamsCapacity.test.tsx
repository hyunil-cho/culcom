import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ComplexClass, ComplexMember } from '@/lib/api';

const mockAddMember = vi.fn();
const mockListMembers = vi.fn();
const mockClassList = vi.fn();
const mockMemberList = vi.fn();
const mockStaffList = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => '/complex/classes/teams',
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    classApi: {
      ...actual.classApi,
      list: (...args: unknown[]) => mockClassList(...args),
      listMembers: (...args: unknown[]) => mockListMembers(...args),
      addMember: (...args: unknown[]) => mockAddMember(...args),
    },
    memberApi: {
      ...actual.memberApi,
      list: (...args: unknown[]) => mockMemberList(...args),
    },
    staffApi: {
      ...actual.staffApi,
      list: (...args: unknown[]) => mockStaffList(...args),
    },
  };
});

const clazz: ComplexClass = {
  seq: 1,
  name: '영어A',
  description: '',
  capacity: 2,
  sortOrder: 0,
  timeSlotSeq: 1,
  timeSlotName: '월수금',
  memberCount: 2,
};

const memberInTeam1: ComplexMember = {
  seq: 101, name: '기존멤버1', phoneNumber: '01011111111', branchSeq: 1,
} as ComplexMember;

const memberInTeam2: ComplexMember = {
  seq: 102, name: '기존멤버2', phoneNumber: '01022222222', branchSeq: 1,
} as ComplexMember;

const candidateMember: ComplexMember = {
  seq: 103, name: '추가대상', phoneNumber: '01033333333', branchSeq: 1,
} as ComplexMember;

function renderPage(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockClassList.mockResolvedValue({
    success: true,
    data: { content: [clazz], totalElements: 1, totalPages: 1, number: 0, size: 200 },
  });
  mockStaffList.mockResolvedValue({ success: true, data: [] });
  mockMemberList.mockResolvedValue({
    success: true,
    data: {
      content: [memberInTeam1, memberInTeam2, candidateMember],
      totalElements: 3, totalPages: 1, number: 0, size: 500,
    },
  });
  mockListMembers.mockResolvedValue({
    success: true,
    data: [memberInTeam1, memberInTeam2],
  });
});

describe('팀 구성 페이지 정원 초과 시', () => {
  it('서버가 실패 응답을 내려주면 에러 모달이 뜨고 팀에 멤버가 추가되지 않는다', async () => {
    mockAddMember.mockResolvedValue({
      success: false,
      message: '정원이 초과되었습니다. (현재 2/2)',
      data: null,
    });

    const { default: Page } = await import('@/app/complex/classes/teams/page');
    renderPage(<Page />);

    // 수업 선택: 클래스 목록 패널에서 '영어A' 클릭
    const classButton = await screen.findByText('영어A');
    fireEvent.click(classButton);

    // 회원 검색
    const searchInput = await screen.findByPlaceholderText(/회원 검색/);
    fireEvent.change(searchInput, { target: { value: '추가' } });

    // 검색 결과에서 '+ 추가' 버튼 클릭
    const addBtn = await screen.findByText('+ 추가');
    fireEvent.click(addBtn);

    // 확인 모달이 뜨고 확인 클릭
    const confirmBtn = await screen.findByRole('button', { name: '추가' });
    fireEvent.click(confirmBtn);

    // 서버는 실패 응답 → 에러 모달에 '정원이 초과' 메시지가 나타난다
    await waitFor(() => {
      expect(screen.getByText(/정원이 초과/)).toBeInTheDocument();
    });

    // 서버 호출은 정확히 1회, 실패 응답을 받았으므로 재호출/추가 확산 없음
    expect(mockAddMember).toHaveBeenCalledTimes(1);
    expect(mockAddMember).toHaveBeenCalledWith(clazz.seq, candidateMember.seq);

    // 팀 멤버 목록은 여전히 2명 (신규 추가 반영 안 됨)
    expect(screen.getByText('기존멤버1')).toBeInTheDocument();
    expect(screen.getByText('기존멤버2')).toBeInTheDocument();
    expect(screen.queryByText('추가대상')).not.toBeInTheDocument();
  });

  it('성공 응답이면 에러 모달 없이 addMember 가 호출된다 (대조군)', async () => {
    mockAddMember.mockResolvedValue({ success: true, message: '팀에 멤버 추가 완료', data: null });

    const { default: Page } = await import('@/app/complex/classes/teams/page');
    renderPage(<Page />);

    fireEvent.click(await screen.findByText('영어A'));
    const searchInput = await screen.findByPlaceholderText(/회원 검색/);
    fireEvent.change(searchInput, { target: { value: '추가' } });
    fireEvent.click(await screen.findByText('+ 추가'));
    fireEvent.click(await screen.findByRole('button', { name: '추가' }));

    await waitFor(() => {
      expect(mockAddMember).toHaveBeenCalled();
    });
    expect(screen.queryByText(/정원이 초과/)).not.toBeInTheDocument();
  });
});
