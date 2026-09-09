import type { CurrentUser } from '@/lib/auth';
import type { NavIconName } from '@/components/ui/icons';
import { canSeeApprovals } from '@/lib/permissions';

export interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: NavIconName;
  visible: (user: CurrentUser) => boolean;
}

export interface NavGroup {
  /** null renders the items with no heading, at the very top. */
  title: string | null;
  items: NavItem[];
}

/**
 * Grouped by area, with a person's own things at the top and the
 * organisation-wide and administrative things below them.
 * Only the modules in scope for this pass — nothing is stubbed in ahead of time.
 */
export const navGroups: NavGroup[] = [
  {
    title: null,
    items: [{ href: '/', label: 'Home', shortLabel: 'Home', icon: 'home', visible: () => true }],
  },
  {
    title: 'Me',
    items: [
      { href: '/attendance', label: 'My Attendance', shortLabel: 'Attendance', icon: 'clock', visible: () => true },
      { href: '/leave', label: 'My Leave', shortLabel: 'Leave', icon: 'calendar', visible: () => true },
      { href: '/documents', label: 'Documents', shortLabel: 'Docs', icon: 'document', visible: () => true },
    ],
  },
  {
    title: 'Team',
    items: [
      { href: '/approvals', label: 'Approvals', shortLabel: 'Approvals', icon: 'inbox', visible: canSeeApprovals },
    ],
  },
  {
    title: 'Organisation',
    items: [
      { href: '/directory', label: 'Directory', shortLabel: 'People', icon: 'people', visible: () => true },
      { href: '/settings', label: 'Settings', shortLabel: 'Settings', icon: 'settings', visible: () => true },
    ],
  },
];

export function visibleNavGroups(user: CurrentUser): NavGroup[] {
  return navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.visible(user)) }))
    .filter((group) => group.items.length > 0);
}

/** Flat list, in the same order — used by the mobile bottom bar. */
export function visibleNavItems(user: CurrentUser): NavItem[] {
  return visibleNavGroups(user).flatMap((group) => group.items);
}
