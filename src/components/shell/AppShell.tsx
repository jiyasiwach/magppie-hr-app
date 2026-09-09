'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { mockPersonas, roleLabels } from '@/lib/auth';
import { APP_BUILD_NOTE, APP_NAME } from '@/lib/constants';
import { employees } from '@/mocks';
import { getPendingCount } from '@/data/requests';
import { useAsync } from '@/hooks/useAsync';
import { useCurrentUser } from './CurrentUserProvider';
import { visibleNavGroups, visibleNavItems } from './nav';
import s from './shell.module.css';

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
}

function RoleSwitcher() {
  const { user, switchUser } = useCurrentUser();
  const options = mockPersonas.map((p) => {
    const employee = employees.find((e) => e.id === p.employeeId);
    return { id: p.employeeId, label: `${p.label} — ${employee?.fullName ?? p.employeeId}` };
  });

  return (
    <div className={s.switcher}>
      <label className={s.switcherLabel} htmlFor="role-switcher">
        Viewing as
      </label>
      <select id="role-switcher" value={user.employee.id} onChange={(e) => switchUser(e.target.value)}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function PendingBadge() {
  const { user } = useCurrentUser();
  const { state } = useAsync(() => getPendingCount(user), [user.employee.id]);
  if (state.status !== 'ready' || state.data === 0) return null;
  return <span className={s.navBadge}>{state.data}</span>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const isActive = useIsActive();
  const groups = visibleNavGroups(user);
  const items = visibleNavItems(user);

  return (
    <div className={s.shell}>
      <header className={s.header}>
        <Link href="/" className={s.brand}>
          {APP_NAME}
          <span className={s.brandNote}>{APP_BUILD_NOTE}</span>
        </Link>
        <div className={s.headerRight}>
          <div className={s.identity}>
            <span className={s.avatar} aria-hidden="true">
              {user.employee.fullName
                .split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('')}
            </span>
            <span className={s.identityText}>
              <span className={s.identityName}>{user.employee.fullName}</span>
              <span className={s.identityRole}>
                {roleLabels[user.role]} · {user.employee.designation}
              </span>
            </span>
          </div>
          <RoleSwitcher />
        </div>
      </header>

      <div className={s.body}>
        <nav className={s.sideNav} aria-label="Main">
          {groups.map((group, i) => (
            <div key={group.title ?? `group-${i}`} className={s.navGroup}>
              {group.title ? <h2 className={s.navGroupTitle}>{group.title}</h2> : null}
              <ul className={s.navList}>
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`${s.navLink} ${isActive(item.href) ? s.navLinkActive : ''}`}
                      aria-current={isActive(item.href) ? 'page' : undefined}
                    >
                      {item.label}
                      {item.href === '/approvals' ? <PendingBadge /> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <main className={s.main}>{children}</main>
      </div>

      <nav className={s.bottomNav} aria-label="Main (mobile)">
        <ul className={s.bottomNavList}>
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`${s.bottomNavLink} ${isActive(item.href) ? s.bottomNavLinkActive : ''}`}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                {item.shortLabel}
                {item.href === '/approvals' ? <PendingBadge /> : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
