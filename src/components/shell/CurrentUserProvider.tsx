'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getCurrentUser, setActiveMockUserId, type CurrentUser } from '@/lib/auth';

interface CurrentUserContextValue {
  user: CurrentUser;
  /** Mock-only: switches which mock person is signed in. Goes with real auth. */
  switchUser: (employeeId: string) => void;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

const STORAGE_KEY = 'magppie-hr:mock-user';

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored) setActiveMockUserId(stored);
    let cancelled = false;
    getCurrentUser().then((resolved) => {
      if (!cancelled) setUser(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const switchUser = useCallback((employeeId: string) => {
    setActiveMockUserId(employeeId);
    window.localStorage.setItem(STORAGE_KEY, employeeId);
    void getCurrentUser().then(setUser);
  }, []);

  if (!user) {
    return (
      <div style={{ padding: 24, color: '#6b6b6b' }} role="status">
        Loading…
      </div>
    );
  }

  return <CurrentUserContext.Provider value={{ user, switchUser }}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): CurrentUserContextValue {
  const value = useContext(CurrentUserContext);
  if (!value) throw new Error('useCurrentUser must be used inside CurrentUserProvider');
  return value;
}
