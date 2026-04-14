import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '@/components/layout/Header';
import { SidebarProvider } from '@/components/layout/SidebarContext';

// next/navigation 모킹
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/dashboard',
}));

// store 모킹
const mockReset = vi.fn();
vi.mock('@/lib/store', () => ({
  useSessionStore: (selector: any) => {
    const state = {
      session: { userSeq: 1, userId: 'admin', name: '관리자', role: 'ROOT', selectedBranchSeq: 1, selectedBranchName: '테스트지점' },
      branches: [
        { seq: 1, branchName: '테스트지점' },
        { seq: 2, branchName: '서울지점' },
      ],
      reset: mockReset,
    };
    return selector(state);
  },
}));

// API 모킹
vi.mock('@/lib/api', () => ({
  authApi: {
    selectBranch: vi.fn(),
    logout: vi.fn(),
  },
  SessionRole: {
    isManager: () => true,
    displayName: (session: any) => session?.name ?? '',
    canManageUsers: () => true,
    isRoot: () => true,
  },
}));

function renderHeader() {
  return render(
    <SidebarProvider>
      <Header />
    </SidebarProvider>
  );
}

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('페이지 제목을 표시한다', () => {
    renderHeader();
    expect(screen.getByText('대시보드')).toBeInTheDocument();
  });

  it('사용자 이름을 표시한다', () => {
    renderHeader();
    expect(screen.getByText('관리자')).toBeInTheDocument();
  });

  it('지점 선택 드롭다운을 표시한다', () => {
    renderHeader();
    expect(screen.getByText('지점 선택:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('테스트지점')).toBeInTheDocument();
  });

  it('지점 옵션이 모두 표시된다', () => {
    renderHeader();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0].textContent).toBe('테스트지점');
    expect(options[1].textContent).toBe('서울지점');
  });

  it('로그아웃 링크가 있다', () => {
    renderHeader();
    expect(screen.getByText('로그아웃')).toBeInTheDocument();
  });

  it('로그아웃 클릭 시 확인 모달 표시', () => {
    renderHeader();
    fireEvent.click(screen.getByText('로그아웃'));
    expect(screen.getByText('로그아웃 확인')).toBeInTheDocument();
    expect(screen.getByText('정말로 로그아웃 하시겠습니까?')).toBeInTheDocument();
  });

  it('로그아웃 모달에서 취소 클릭 시 모달 닫힘', () => {
    renderHeader();
    fireEvent.click(screen.getByText('로그아웃'));
    expect(screen.getByText('로그아웃 확인')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(screen.queryByText('로그아웃 확인')).not.toBeInTheDocument();
  });

  it('메뉴 토글 버튼이 있다', () => {
    renderHeader();
    expect(screen.getByLabelText('메뉴 열기')).toBeInTheDocument();
  });
});
