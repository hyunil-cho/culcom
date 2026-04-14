import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MainSidebar from '@/components/layout/MainSidebar';
import { SidebarProvider } from '@/components/layout/SidebarContext';

// next/navigation 모킹
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

// next/link 모킹
vi.mock('next/link', () => ({
  default: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>{children}</a>
  ),
}));

// store 모킹 — ROOT 사용자
vi.mock('@/lib/store', () => ({
  useSessionStore: (selector: any) => {
    const state = {
      session: { role: 'ROOT' },
    };
    return selector(state);
  },
}));

// SessionRole 모킹
vi.mock('@/lib/api', () => ({
  SessionRole: {
    canManageUsers: () => true,
    isManager: () => true,
    isRoot: () => true,
    displayName: () => '관리자',
  },
}));

function renderSidebar() {
  return render(
    <SidebarProvider>
      <MainSidebar />
    </SidebarProvider>
  );
}

describe('MainSidebar', () => {
  it('타이틀이 E-UT이다', () => {
    renderSidebar();
    expect(screen.getByText('E-UT')).toBeInTheDocument();
  });

  it('메인 메뉴 항목을 표시한다', () => {
    renderSidebar();
    expect(screen.getByText('대시보드')).toBeInTheDocument();
    expect(screen.getByText('상담 예약 캘린더')).toBeInTheDocument();
    expect(screen.getByText('지원자 회신 관리')).toBeInTheDocument();
    expect(screen.getByText('공지사항')).toBeInTheDocument();
    expect(screen.getByText('메시지 템플릿 관리')).toBeInTheDocument();
    expect(screen.getByText('동의항목 관리')).toBeInTheDocument();
  });

  it('ROOT 사용자에게 관리 메뉴 표시', () => {
    renderSidebar();
    expect(screen.getByText('지점 관리')).toBeInTheDocument();
    expect(screen.getByText('사용자 관리')).toBeInTheDocument();
  });

  it('연동 그룹을 표시한다', () => {
    renderSidebar();
    expect(screen.getByText('연동 관리')).toBeInTheDocument();
    expect(screen.getByText('카카오싱크')).toBeInTheDocument();
  });

  it('하위사이트 메뉴를 표시한다', () => {
    renderSidebar();
    expect(screen.getByText('E-UT 관리')).toBeInTheDocument();
  });

  it('설정 메뉴를 표시한다', () => {
    renderSidebar();
    // '설정' 텍스트가 그룹 타이틀과 메뉴 항목 둘 다에 있을 수 있음
    const settingsElements = screen.getAllByText('설정');
    expect(settingsElements.length).toBeGreaterThanOrEqual(1);
  });
});
