import type { NavIconName } from '@/components/ui/icons';

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
}

/**
 * The five sections. Bottom bar on a phone, left navigation on desktop, same
 * order in both. Everything else in the app is reached from inside one of
 * these — there is no sixth item.
 */
export const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/inbox', label: 'Inbox', icon: 'inbox' },
  { href: '/wall', label: 'Wall', icon: 'wall' },
  { href: '/me', label: 'Me', icon: 'user' },
  { href: '/team', label: 'My Team', icon: 'people' },
];
