'use client';

import SidebarShell from './SidebarShell';
import { useSessionStore } from '@/lib/store';
import { SessionRole } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import type { MenuGroup } from './SidebarShell';

export default function MainSidebar() {
  const session = useSessionStore((s) => s.session);

  const groups: MenuGroup[] = [
    {
      title: '메인',
      items: [
        { href: ROUTES.DASHBOARD, label: '대시보드', icon: '📊' },
        { href: ROUTES.CALENDAR, label: '상담 예약 캘린더', icon: '📅' },
        { href: ROUTES.CUSTOMERS, label: '지원자 회신 관리', icon: '👥' },
        { href: ROUTES.NOTICES, label: '공지사항', icon: '📢' },
        { href: ROUTES.MESSAGE_TEMPLATES, label: '메시지 템플릿 관리', icon: '📝' },
        { href: ROUTES.CONSENT_ITEMS, label: '동의항목 관리', icon: '📄' },
        { href: ROUTES.SURVEY, label: '설문 관리', icon: '📋', children: [
          { href: ROUTES.SURVEY, label: '설문지 관리' },
          { href: ROUTES.SURVEY_SUBMISSIONS, label: '설문지 결과 열람' },
        ]},
        ...(SessionRole.canManageUsers(session) ? [{ href: ROUTES.BRANCHES, label: '지점 관리', icon: '🏢' }] : []),
        ...(SessionRole.canManageUsers(session) ? [{ href: ROUTES.USERS, label: '사용자 관리', icon: '🔑' }] : []),
      ],
    },
    {
      title: '연동',
      items: [
        { href: ROUTES.INTEGRATIONS, label: '연동 관리', icon: '🔗' },
        { href: ROUTES.KAKAO_SYNC, label: '카카오싱크', icon: '💬' },
      ],
    },
    {
      title: '하위사이트',
      items: [
        { href: ROUTES.COMPLEX, label: 'E-UT 관리', icon: '🏠' },
      ],
    },
    ...(SessionRole.canManageUsers(session) ? [{
      title: '관리',
      items: [
        { href: ROUTES.SETTINGS, label: '설정', icon: '⚙️', children: [
          { href: ROUTES.SETTINGS, label: '설정' },
          { href: ROUTES.SETTINGS_CATALOGS, label: '옵션 카탈로그' },
        ]},
      ],
    }] : []),
  ];

  return <SidebarShell groups={groups} title="E-UT"/>;
}
