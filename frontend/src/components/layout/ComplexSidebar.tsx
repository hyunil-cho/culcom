'use client';

import SidebarShell from './SidebarShell';
import { ROUTES } from '@/lib/routes';

const groups = [
  {
    title: '수업 관리',
    items: [
      { href: ROUTES.COMPLEX_DASHBOARD, label: '대시보드', icon: '📊' },
      { href: ROUTES.COMPLEX_ATTENDANCE, label: '팀 현황 관리', icon: '✅' },
      { href: ROUTES.COMPLEX_MEMBERSHIPS, label: '멤버십 관리', icon: '🎫' },
      { href: ROUTES.COMPLEX_TIMESLOTS, label: '시간대 설정', icon: '⏰' },
      { href: ROUTES.COMPLEX_CLASSES, label: '팀 관리', icon: '📚', children: [
        { href: ROUTES.COMPLEX_CLASSES, label: '팀 리스트' },
        { href: ROUTES.COMPLEX_CLASS_TEAMS, label: '팀 구성' },
      ]},
      { href: ROUTES.COMPLEX_STAFFS, label: '스태프 관리', icon: '👨‍🏫' },
      { href: ROUTES.COMPLEX_MEMBERS, label: '회원 관리', icon: '🧑‍🎓', children: [
        { href: ROUTES.COMPLEX_MEMBERS, label: '멤버 리스트' },
        { href: ROUTES.COMPLEX_MEMBER_LINKS, label: '링크 관리' },
        { href: ROUTES.COMPLEX_OUTSTANDING, label: '미수금 관리' },
      ]},
      { href: ROUTES.COMPLEX_POSTPONEMENTS, label: '연기 요청', icon: '⏸️' },
      { href: ROUTES.COMPLEX_REFUNDS, label: '환불 요청', icon: '💰' },
      { href: ROUTES.COMPLEX_TRANSFER_REQUESTS, label: '양도 요청', icon: '🔄' },
      { href: ROUTES.ROOT, label: '메인으로', icon: '✅' },
    ],
  },
  {
    title: '설정',
    items: [
      { href: ROUTES.COMPLEX_SETTINGS_PAYMENT_METHODS, label: '결제 방법', icon: '💳' },
      { href: ROUTES.COMPLEX_SETTINGS_BANKS, label: '환급 은행', icon: '🏦' },
      { href: ROUTES.COMPLEX_SETTINGS_SIGNUP_CHANNELS, label: '가입 경로', icon: '📢' },
    ],
  },
];

export default function ComplexSidebar() {
  return <SidebarShell groups={groups} title="E-UT" />;
}
