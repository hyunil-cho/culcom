'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './SidebarShell.module.css';

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
    <aside className={styles.aside}>
      <div className={styles.logo}>
        <h1 className={styles.logoTitle}>Culcom</h1>
      </div>

      <nav className={styles.nav}>
        {groups.map((group) => (
          <div key={group.title}>
            <div className={styles.groupTitle}>{group.title}</div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={pathname.startsWith(item.href) ? styles.linkActive : styles.link}
              >
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