'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface MenuItem {
  href: string;
  label: string;
  icon: string;
}

export interface MenuGroup {
  title: string;
  items: MenuItem[];
}

export default function SidebarShell({ groups }: { groups: MenuGroup[] }) {
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
        {groups.map((group) => (
          <div key={group.title}>
            <div style={{ padding: '0 16px', marginBottom: 8, fontSize: 11, textTransform: 'uppercase', color: '#9ca3af' }}>
              {group.title}
            </div>
            {group.items.map((item) => (
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
          </div>
        ))}
      </nav>
    </aside>
  );
}
