import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ComplexSidebar from '@/components/layout/ComplexSidebar';
import { SidebarProvider } from '@/components/layout/SidebarContext';

// next/navigation 모킹
vi.mock('next/navigation', () => ({
  usePathname: () => '/complex/attendance',
}));

// next/link 모킹
vi.mock('next/link', () => ({
  default: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>{children}</a>
  ),
}));

function renderSidebar() {
  return render(
    <SidebarProvider>
      <ComplexSidebar />
    </SidebarProvider>
  );
}

describe('ComplexSidebar', () => {
  it('타이틀이 E-UT이다', () => {
    renderSidebar();
    expect(screen.getByText('E-UT')).toBeInTheDocument();
  });

  it('수업 관리 그룹 항목을 표시한다', () => {
    renderSidebar();
    expect(screen.getByText('대시보드')).toBeInTheDocument();
    expect(screen.getByText('팀 현황 관리')).toBeInTheDocument();
    expect(screen.getByText('멤버십 관리')).toBeInTheDocument();
    expect(screen.getByText('시간대 설정')).toBeInTheDocument();
    expect(screen.getByText('스태프 관리')).toBeInTheDocument();
    expect(screen.getByText('연기 요청')).toBeInTheDocument();
    expect(screen.getByText('환불 관리')).toBeInTheDocument();
    expect(screen.getByText('양도 요청')).toBeInTheDocument();
    expect(screen.getByText('메인으로')).toBeInTheDocument();
  });

  it('설정 그룹 항목을 표시한다', () => {
    renderSidebar();
    expect(screen.getByText('옵션 카탈로그')).toBeInTheDocument();
  });

  it('수업 관리 그룹 타이틀 표시', () => {
    renderSidebar();
    expect(screen.getByText('수업 관리')).toBeInTheDocument();
  });
});
