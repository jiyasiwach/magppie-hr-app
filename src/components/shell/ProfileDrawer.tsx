'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Avatar, Button } from '@/components/ui';
import {
  IconClose,
  IconFeedback,
  IconIdCard,
  IconInfo,
  IconLogout,
  IconSettings,
} from '@/components/ui/icons';
import { APP_NAME, APP_VERSION, ORGANISATION_NAME } from '@/lib/constants';
import { roleLabels } from '@/lib/auth';
import { useCurrentUser } from './CurrentUserProvider';
import s from './shell.module.css';

export function ProfileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useCurrentUser();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!open) return null;

  return (
    <>
      <button type="button" className={s.scrim} aria-label="Close menu" onClick={onClose} />
      <aside className={s.drawer} role="dialog" aria-label="Your account">
        <div className={s.drawerHead}>
          <button type="button" className={s.drawerClose} onClick={onClose} aria-label="Close">
            <IconClose size={20} />
          </button>
          <Avatar name={user.employee.fullName} size="lg" />
          <div className={s.drawerIdentity}>
            <strong>{user.employee.fullName}</strong>
            <span className={s.drawerMeta}>
              {user.employee.designation} · {roleLabels[user.role]}
            </span>
            <span className={s.drawerMeta}>{ORGANISATION_NAME}</span>
          </div>
        </div>

        <nav className={s.drawerNav}>
          <Link href="/settings" className={s.drawerLink} onClick={onClose}>
            <IconSettings size={18} />
            Settings
          </Link>
          <Link href="/me/id-card" className={s.drawerLink} onClick={onClose}>
            <IconIdCard size={18} />
            View ID card
          </Link>
          <Link href="/feedback" className={s.drawerLink} onClick={onClose}>
            <IconFeedback size={18} />
            Send feedback
          </Link>
          <Link href="/about" className={s.drawerLink} onClick={onClose}>
            <IconInfo size={18} />
            About
            <span className={s.drawerVersion}>{APP_VERSION}</span>
          </Link>
        </nav>

        <div className={s.drawerFooter}>
          <div className={s.logoutBlock}>
            <span className={s.drawerLinkStatic}>
              <IconLogout size={18} />
              Logout
            </span>
            <p className={s.drawerNote}>
              There is no sign-in yet, so there is nothing to log out of. Use the role switcher in the
              top bar to change who you are looking at.
            </p>
          </div>
          <Button variant="quiet" onClick={onClose}>
            Close
          </Button>
          <p className={s.drawerNote}>
            {APP_NAME} · {APP_VERSION} · mock data
          </p>
        </div>
      </aside>
    </>
  );
}
