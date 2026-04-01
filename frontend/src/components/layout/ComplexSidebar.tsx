'use client';

import SidebarShell from './SidebarShell';

const groups = [
  {
    title: '수업 관리',
    items: [
      { href: '/complex/classes', label: '수업 관리', icon: '📚' },
      { href: '/complex/members', label: '회원 관리', icon: '🧑‍🎓' },
      { href: '/complex/staffs', label: '스태프 관리', icon: '👨‍🏫' },
      { href: '/complex/attendance', label: '출석 관리', icon: '✅' },
      { href: '/complex/memberships', label: '멤버십', icon: '🎫' },
      { href: '/complex/timeslots', label: '시간대 설정', icon: '⏰' },
      { href: '/complex/postponements', label: '연기 요청', icon: '⏸️' },
      { href: '/complex/refunds', label: '환불 요청', icon: '💰' },
      { href: '/complex/survey', label: '설문 관리', icon: '📋' },
    ],
  },
];

export default function ComplexSidebar() {
  return <SidebarShell groups={groups} />;
}
