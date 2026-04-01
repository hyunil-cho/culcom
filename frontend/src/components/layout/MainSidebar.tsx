'use client';

import SidebarShell from './SidebarShell';
import { useSessionStore } from '@/lib/store';
import type { MenuGroup } from './SidebarShell';

export default function MainSidebar() {
  const session = useSessionStore((s) => s.session);
  const role = session?.role;

  const groups: MenuGroup[] = [
    {
      title: '메인',
      items: [
        { href: '/dashboard', label: '대시보드', icon: '📊' },
        { href: '/customers', label: '지원자 회신 관리', icon: '👥' },
        ...(role === 'ROOT' ? [{ href: '/branches', label: '지점 관리', icon: '🏢' }] : []),
        ...(role === 'ROOT' || role === 'BRANCH_MANAGER'
          ? [{ href: '/users', label: '사용자 관리', icon: '🔑' }]
          : []),
      ],
    },
  ];

  return <SidebarShell groups={groups} />;
}
