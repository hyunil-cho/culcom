import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SidebarShell, { type MenuGroup } from '@/components/layout/SidebarShell';
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

const testGroups: MenuGroup[] = [
  {
    title: '메인',
    items: [
      { href: '/dashboard', label: '대시보드', icon: '📊' },
      { href: '/customers', label: '고객 관리', icon: '👥' },
    ],
  },
  {
    title: '설정',
    items: [
      { href: '/settings', label: '설정', icon: '⚙️' },
    ],
  },
];

function renderWithProvider(ui: React.ReactElement) {
  return render(<SidebarProvider>{ui}</SidebarProvider>);
}

describe('SidebarShell', () => {
  it('타이틀을 렌더링한다', () => {
    renderWithProvider(<SidebarShell groups={testGroups} title="E-UT" />);
    expect(screen.getByText('E-UT')).toBeInTheDocument();
  });

  it('그룹 제목을 표시한다', () => {
    renderWithProvider(<SidebarShell groups={testGroups} />);
    expect(screen.getByText('메인')).toBeInTheDocument();
    // '설정'은 그룹 타이틀과 메뉴 항목 둘 다에 존재
    const settingsElements = screen.getAllByText('설정');
    expect(settingsElements.length).toBe(2);
  });

  it('메뉴 항목을 표시한다', () => {
    renderWithProvider(<SidebarShell groups={testGroups} />);
    expect(screen.getByText('대시보드')).toBeInTheDocument();
    expect(screen.getByText('고객 관리')).toBeInTheDocument();
    // 설정 메뉴가 링크로 존재하는지 확인
    const settingsLink = screen.getByRole('link', { name: /⚙️\s*설정/ });
    expect(settingsLink).toBeInTheDocument();
  });

  it('현재 경로의 항목에 active 클래스 적용', () => {
    renderWithProvider(<SidebarShell groups={testGroups} />);
    const dashboardLink = screen.getByText('대시보드').closest('a');
    expect(dashboardLink?.className).toContain('Active');
  });

  it('비활성 항목에는 active 클래스 미적용', () => {
    renderWithProvider(<SidebarShell groups={testGroups} />);
    const customersLink = screen.getByText('고객 관리').closest('a');
    expect(customersLink?.className).not.toContain('Active');
  });

  it('children이 있는 메뉴 항목은 토글 가능', () => {
    const groupsWithChildren: MenuGroup[] = [
      {
        title: '메인',
        items: [
          {
            href: '/survey', label: '설문 관리', icon: '📋',
            children: [
              { href: '/survey', label: '설문지 관리' },
              { href: '/survey/submissions', label: '설문 결과' },
            ],
          },
        ],
      },
    ];

    renderWithProvider(<SidebarShell groups={groupsWithChildren} />);
    // 부모 메뉴 버튼 확인
    expect(screen.getByText('설문 관리')).toBeInTheDocument();
  });

  it('기본 타이틀은 culcom', () => {
    renderWithProvider(<SidebarShell groups={testGroups} />);
    expect(screen.getByText('culcom')).toBeInTheDocument();
  });
});
