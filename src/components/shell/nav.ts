import type { NavIconName } from '@/components/ui/icons';

export interface NavItem {
  href: string;
  label: string;
  /** Used by the bottom bar, where six labels have to share a phone's width. */
  shortLabel: string;
  icon: NavIconName;
}

/**
 * The sections. Bottom bar on a phone, left navigation on desktop, same order
 * in both.
 *
 * Policies is a top-level item at the owner's explicit request, taking this to
 * six. The brief fixes five; the cost is a tighter bottom bar on a phone, which
 * is why the bar uses `shortLabel`.
 */
export const navItems: NavItem[] = [
  { href: '/', label: 'Home', shortLabel: 'Home', icon: 'home' },
  { href: '/inbox', label: 'Inbox', shortLabel: 'Inbox', icon: 'inbox' },
  { href: '/wall', label: 'Wall', shortLabel: 'Wall', icon: 'wall' },
  { href: '/me', label: 'Me', shortLabel: 'Me', icon: 'user' },
  { href: '/team', label: 'My Team', shortLabel: 'Team', icon: 'people' },
  { href: '/policies', label: 'Policies', shortLabel: 'Policies', icon: 'policy' },
];
