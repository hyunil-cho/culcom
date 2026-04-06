'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './SidebarShell.module.css';

export interface MenuItem {
  href: string;
  label: string;
  icon: string;
  children?: { href: string; label: string }[];
}

export interface MenuGroup {
  title: string;
  items: MenuItem[];
}

function SidebarItem({ item, pathname }: { item: MenuItem; pathname: string }) {
  const hasChildren = item.children && item.children.length > 0;
  const isChildActive = hasChildren && item.children!.some(c => pathname.startsWith(c.href));
  const [open, setOpen] = useState(isChildActive || pathname.startsWith(item.href));

  if (!hasChildren) {
    return (
      <Link
        href={item.href}
        className={pathname.startsWith(item.href) ? styles.linkActive : styles.link}
      >
        <span>{item.icon}</span>
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        className={isChildActive ? styles.linkActive : styles.link}
        onClick={() => setOpen(!open)}
        style={{ width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        <span>{item.icon}</span>
        {item.label}
        <span style={{ marginLeft: 'auto', fontSize: '10px' }}>{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className={styles.childList}>
          {item.children!.map((child, idx) => {
            // 첫 번째 자식이 부모와 같은 href면 exact match, 나머지는 startsWith
            const isExact = child.href === item.href;
            const isActive = isExact
              ? pathname === child.href || (pathname.startsWith(child.href + '/') && !item.children!.some((c, j) => j !== idx && pathname.startsWith(c.href)))
              : pathname === child.href || pathname.startsWith(child.href + '/');
            return (
              <Link
                key={child.href}
                href={child.href}
                className={isActive ? styles.childLinkActive : styles.childLink}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SidebarShell({ groups }: { groups: MenuGroup[] }) {
  const pathname = usePathname();

  return (
    <aside className={styles.aside}>
      <div className={styles.logo}>
        <h1 className={styles.logoTitle}>Culcom</h1>
      </div>

      <nav className={styles.nav}>
        {groups.map((group) => (
          <div key={group.title}>
            <div className={styles.groupTitle}>{group.title}</div>
            {group.items.map((item) => (
              <SidebarItem key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}