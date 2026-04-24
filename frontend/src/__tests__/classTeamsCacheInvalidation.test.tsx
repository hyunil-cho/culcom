import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import type { ComplexClass, ComplexMember, ComplexStaff } from '@/lib/api';

const mockClassList = vi.fn();
const mockClassGet = vi.fn();
const mockListMembers = vi.fn();
const mockAddMember = vi.fn();
const mockRemoveMember = vi.fn();
const mockSetLeader = vi.fn();
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
      get: (...args: unknown[]) => mockClassGet(...args),
      listMembers: (...args: unknown[]) => mockListMembers(...args),
      addMember: (...args: unknown[]) => mockAddMember(...args),
      removeMember: (...args: unknown[]) => mockRemoveMember(...args),
      setLeader: (...args: unknown[]) => mockSetLeader(...args),
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
  capacity: 5,
  sortOrder: 0,
  timeSlotSeq: 1,
  timeSlotName: '월수금',
  memberCount: 1,
};

const clazzWithLeader: ComplexClass = {
  ...clazz,
  staffSeq: 201,
  staffName: '김리더',
};

const teamMember: ComplexMember = {
  seq: 101, name: '기존멤버', phoneNumber: '01011111111', branchSeq: 1,
} as ComplexMember;

const candidateMember: ComplexMember = {
  seq: 102, name: '추가대상', phoneNumber: '01022222222', branchSeq: 1,
} as ComplexMember;

const staff: ComplexStaff = {
  seq: 201, name: '김리더', phoneNumber: '01099999999', branchSeq: 1,
} as ComplexStaff;

function renderPage(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  queryClient.clear();
  mockClassList.mockResolvedValue({
    success: true,
    data: { content: [clazz], totalElements: 1, totalPages: 1, number: 0, size: 200 },
  });
  mockStaffList.mockResolvedValue({ success: true, data: [staff] });
  mockMemberList.mockResolvedValue({
    success: true,
    data: {
      content: [teamMember, candidateMember],
      totalElements: 2, totalPages: 1, number: 0, size: 500,
    },
  });
  mockListMembers.mockResolvedValue({ success: true, data: [teamMember] });
});

describe('팀 구성 변경 시 수업 리스트 캐시 무효화', () => {
  it('멤버 추가 성공 시 [classes] prefix가 invalidate된다', async () => {
    mockAddMember.mockResolvedValue({ success: true, message: '추가 완료', data: null });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { default: Page } = await import('@/app/complex/classes/teams/page');
    renderPage(<Page />);

    fireEvent.click(await screen.findByText('영어A'));
    const searchInput = await screen.findByPlaceholderText(/회원 검색/);
    fireEvent.change(searchInput, { target: { value: '추가' } });
    fireEvent.click(await screen.findByText('+ 추가'));
    fireEvent.click(await screen.findByRole('button', { name: '추가' }));

    await waitFor(() => {
      expect(mockAddMember).toHaveBeenCalledWith(clazz.seq, candidateMember.seq);
    });
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['classes'] });
    });
  });

  it('멤버 추가 실패 시 [classes]는 invalidate되지 않는다', async () => {
    mockAddMember.mockResolvedValue({ success: false, message: '정원 초과', data: null });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

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
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['classes'] });
  });

  it('멤버 제외 성공 시 [classes]와 attendance 관련 키가 모두 invalidate된다', async () => {
    mockRemoveMember.mockResolvedValue({ success: true, message: '제외 완료', data: null });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { default: Page } = await import('@/app/complex/classes/teams/page');
    renderPage(<Page />);

    fireEvent.click(await screen.findByText('영어A'));
    // 팀 멤버 리스트의 '제외' 버튼 클릭
    fireEvent.click(await screen.findByRole('button', { name: '제외' }));
    // 확인 모달의 '제외' 버튼 클릭
    const confirmButtons = await screen.findAllByRole('button', { name: '제외' });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(mockRemoveMember).toHaveBeenCalledWith(clazz.seq, teamMember.seq);
    });
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['classes'] });
    });
    // attendance 페이지 팀 정보가 즉시 반영되도록 attendanceView/Detail 도 무효화되어야 한다
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['attendanceView'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['attendanceViewDetail'] });
  });

  it('리더 지정 성공 시 [classes] prefix가 invalidate된다', async () => {
    mockSetLeader.mockResolvedValue({ success: true, message: '리더 지정 완료', data: null });
    mockClassGet.mockResolvedValue({ success: true, data: clazzWithLeader });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { default: Page } = await import('@/app/complex/classes/teams/page');
    renderPage(<Page />);

    fireEvent.click(await screen.findByText('영어A'));
    // 리더 후보에서 '김리더' 버튼 클릭
    fireEvent.click(await screen.findByText('김리더'));
    // 확인 모달의 '변경' 버튼 클릭
    fireEvent.click(await screen.findByRole('button', { name: '변경' }));

    await waitFor(() => {
      expect(mockSetLeader).toHaveBeenCalledWith(clazz.seq, staff.seq);
    });
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['classes'] });
    });
  });

  it('리더 해제 성공 시 [classes] prefix가 invalidate된다', async () => {
    // 리더가 이미 배정된 상태로 시작
    mockClassList.mockResolvedValue({
      success: true,
      data: { content: [clazzWithLeader], totalElements: 1, totalPages: 1, number: 0, size: 200 },
    });
    mockSetLeader.mockResolvedValue({ success: true, message: '해제 완료', data: null });
    mockClassGet.mockResolvedValue({ success: true, data: { ...clazzWithLeader, staffSeq: undefined, staffName: undefined } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { default: Page } = await import('@/app/complex/classes/teams/page');
    renderPage(<Page />);

    fireEvent.click(await screen.findByText('영어A'));
    fireEvent.click(await screen.findByRole('button', { name: '리더 해제' }));
    fireEvent.click(await screen.findByRole('button', { name: '해제' }));

    await waitFor(() => {
      expect(mockSetLeader).toHaveBeenCalledWith(clazzWithLeader.seq, null);
    });
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['classes'] });
    });
  });
});
