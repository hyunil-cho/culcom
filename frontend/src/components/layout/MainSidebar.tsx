'use client';

import SidebarShell from './SidebarShell';
import { useSessionStore } from '@/lib/store';
import { SessionRole } from '@/lib/api';
import type { MenuGroup } from './SidebarShell';

export default function MainSidebar() {
  const session = useSessionStore((s) => s.session);

  const groups: MenuGroup[] = [
    {
      title: '메인',
      items: [
        { href: '/dashboard', label: '대시보드', icon: '📊' },
        { href: '/customers', label: '지원자 회신 관리', icon: '👥' },
        { href: '/notices', label: '공지사항', icon: '📢' },
        ...(SessionRole.canManageUsers(session) ? [{ href: '/branches', label: '지점 관리', icon: '🏢' }] : []),
        ...(SessionRole.canManageUsers(session) ? [{ href: '/users', label: '사용자 관리', icon: '🔑' }] : []),
      ],
    },
    {
      title: '연동',
      items: [
        { href: '/integrations', label: '연동 관리', icon: '🔗' },
        { href: '/kakao-sync', label: '카카오싱크', icon: '💬' },
      ],
    },
    ...(SessionRole.canManageUsers(session) ? [{
      title: '관리',
      items: [
        { href: '/settings', label: '설정', icon: '⚙️' },
      ],
    }] : []),
  ];

  return <SidebarShell groups={groups} />;
}
