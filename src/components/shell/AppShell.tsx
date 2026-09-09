'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { navIcons } from '@/components/ui/icons';
import { getPendingCount } from '@/data/requests';
import { useAsync } from '@/hooks/useAsync';
import { mockPersonas } from '@/lib/auth';
import { APP_NAME } from '@/lib/constants';
import { employees } from '@/mocks';
import { ColleagueSearch } from './ColleagueSearch';
import { CurrentUserProvider, useCurrentUser } from './CurrentUserProvider';
import { navItems } from './nav';
import { ProfileDrawer } from './ProfileDrawer';
import s from './shell.module.css';

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
}

export function RoleSwitcher({ block = false }: { block?: boolean }) {
  const { user, switchUser } = useCurrentUser();
  return (
    <div className={block ? s.switcherBlock : s.switcher}>
      <label className={s.switcherLabel} htmlFor={block ? 'role-switcher-drawer' : 'role-switcher'}>
        Viewing as
      </label>
      <select
        id={block ? 'role-switcher-drawer' : 'role-switcher'}
        value={user.employee.id}
        onChange={(e) => switchUser(e.target.value)}
      >
        {mockPersonas.map((p) => (
          <option key={p.employeeId} value={p.employeeId}>
            {p.label} — {employees.find((e) => e.id === p.employeeId)?.fullName ?? p.employeeId}
          </option>
        ))}
      </select>
    </div>
  );
}

function InboxBadge() {
  const { user } = useCurrentUser();
  const { state } = useAsync(() => getPendingCount(user), [user.employee.id]);
  if (state.status !== 'ready' || state.data === 0) return null;
  return <span className={s.navBadge}>{state.data}</span>;
}

function Chrome({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const isActive = useIsActive();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const initials = user.employee.fullName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');

  return (
    <div className={s.shell}>
      <header className={s.topBar}>
        <button
          type="button"
          className={s.avatarButton}
          onClick={() => setDrawerOpen(true)}
          aria-label={`Open your account menu, ${user.employee.fullName}`}
        >
          <span className={s.avatarButtonInner} aria-hidden="true">
            {initials}
          </span>
        </button>

        <ColleagueSearch />

        <div className={s.topBarRight}>
          <span className={s.brand}>{APP_NAME}</span>
          <div className={s.switcherDesktop}>
            <RoleSwitcher />
          </div>
        </div>
      </header>

      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className={s.body}>
        <nav className={s.sideNav} aria-label="Sections">
          <ul className={s.navList}>
            {navItems.map((item) => {
              const Icon = navIcons[item.icon];
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`${s.navLink} ${isActive(item.href) ? s.navLinkActive : ''}`}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                  >
                    <Icon className={s.navIcon} />
                    <span className={s.navLabel}>{item.label}</span>
                    {item.href === '/inbox' ? <InboxBadge /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className={s.main}>{children}</main>
      </div>

      <nav className={s.bottomNav} aria-label="Sections">
        <ul className={s.bottomNavList}>
          {navItems.map((item) => {
            const Icon = navIcons[item.icon];
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`${s.bottomNavLink} ${isActive(item.href) ? s.bottomNavLinkActive : ''}`}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  <Icon size={21} />
                  <span>{item.label}</span>
                  {item.href === '/inbox' ? <InboxBadge /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <CurrentUserProvider>
      <Chrome>{children}</Chrome>
    </CurrentUserProvider>
  );
}
