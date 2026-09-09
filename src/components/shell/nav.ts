import type { CurrentUser } from '@/lib/auth';
import { canSeeApprovals } from '@/lib/permissions';

export interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  visible: (user: CurrentUser) => boolean;
}

/** Only the modules in scope for this pass. Nothing is stubbed in ahead of time. */
export const navItems: NavItem[] = [
  { href: '/', label: 'Home', shortLabel: 'Home', visible: () => true },
  { href: '/directory', label: 'Directory', shortLabel: 'People', visible: () => true },
  { href: '/attendance', label: 'My Attendance', shortLabel: 'Attendance', visible: () => true },
  { href: '/leave', label: 'My Leave', shortLabel: 'Leave', visible: () => true },
  { href: '/approvals', label: 'Approvals', shortLabel: 'Approvals', visible: canSeeApprovals },
  { href: '/documents', label: 'Documents', shortLabel: 'Docs', visible: () => true },
  { href: '/settings', label: 'Settings', shortLabel: 'Settings', visible: () => true },
];

export function visibleNavItems(user: CurrentUser): NavItem[] {
  return navItems.filter((item) => item.visible(user));
}
