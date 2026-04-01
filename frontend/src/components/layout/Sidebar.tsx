'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const mainMenuItems = [
  { href: '/dashboard', label: '대시보드', icon: '📊' },
  { href: '/customers', label: '고객 관리', icon: '👥' },
  { href: '/branches', label: '지점 관리', icon: '🏢' },
];

const complexMenuItems = [
  { href: '/complex/classes', label: '수업 관리', icon: '📚' },
  { href: '/complex/members', label: '회원 관리', icon: '🧑‍🎓' },
  { href: '/complex/staffs', label: '스태프 관리', icon: '👨‍🏫' },
  { href: '/complex/attendance', label: '출석 관리', icon: '✅' },
  { href: '/complex/memberships', label: '멤버십', icon: '🎫' },
  { href: '/complex/timeslots', label: '시간대 설정', icon: '⏰' },
  { href: '/complex/postponements', label: '연기 요청', icon: '⏸️' },
  { href: '/complex/refunds', label: '환불 요청', icon: '💰' },
  { href: '/complex/survey', label: '설문 관리', icon: '📋' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 240,
      backgroundColor: 'var(--sidebar-bg)',
      color: 'var(--sidebar-text)',
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      overflowY: 'auto',
      padding: '20px 0',
    }}>
      <div style={{ padding: '0 20px 20px', borderBottom: '1px solid #374151' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>Culcom</h1>
      </div>

      <nav style={{ padding: '16px 0' }}>
        <div style={{ padding: '0 16px', marginBottom: 8, fontSize: 11, textTransform: 'uppercase', color: '#9ca3af' }}>
          메인
        </div>
        {mainMenuItems.map((item) => (
          <Link key={item.href} href={item.href} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 20px',
            color: pathname === item.href ? 'white' : 'var(--sidebar-text)',
            backgroundColor: pathname === item.href ? 'var(--sidebar-active)' : 'transparent',
            fontSize: 14,
            textDecoration: 'none',
          }}>
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <div style={{ padding: '16px 16px 8px', fontSize: 11, textTransform: 'uppercase', color: '#9ca3af' }}>
          수업 관리
        </div>
        {complexMenuItems.map((item) => (
          <Link key={item.href} href={item.href} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 20px',
            color: pathname.startsWith(item.href) ? 'white' : 'var(--sidebar-text)',
            backgroundColor: pathname.startsWith(item.href) ? 'var(--sidebar-active)' : 'transparent',
            fontSize: 14,
            textDecoration: 'none',
          }}>
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
