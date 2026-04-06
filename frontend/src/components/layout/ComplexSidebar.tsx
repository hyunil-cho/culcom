'use client';

import SidebarShell from './SidebarShell';
import { ROUTES } from '@/lib/routes';

const groups = [
  {
    title: '수업 관리',
    items: [
      { href: ROUTES.COMPLEX_ATTENDANCE, label: '팀 현황 관리', icon: '✅' },
      { href: ROUTES.COMPLEX_MEMBERSHIPS, label: '멤버십 관리', icon: '🎫' },
      { href: ROUTES.COMPLEX_TIMESLOTS, label: '시간대 설정', icon: '⏰' },
      { href: ROUTES.COMPLEX_CLASSES, label: '수업 관리', icon: '📚' },
      { href: ROUTES.COMPLEX_STAFFS, label: '스태프 관리', icon: '👨‍🏫' },
      { href: ROUTES.COMPLEX_MEMBERS, label: '회원 관리', icon: '🧑‍🎓' },
      { href: ROUTES.COMPLEX_POSTPONEMENTS, label: '연기 요청', icon: '⏸️' },
      { href: ROUTES.COMPLEX_REFUNDS, label: '환불 요청', icon: '💰' }
    ],
  },
];

export default function ComplexSidebar() {
  return <SidebarShell groups={groups} />;
}
