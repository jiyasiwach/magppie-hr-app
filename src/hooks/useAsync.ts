'use client';

import { useCallback, useEffect, useState } from 'react';
import { dataVersion, subscribe } from '@/data/store';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; data: T };

/**
 * Every list on every screen goes through this, which is why loading, error and
 * empty states exist by construction rather than being bolted on later.
 *
 * The result is keyed by the dependencies, so a change to a filter shows the
 * loading state again without any synchronous setState in the effect body.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): {
  state: AsyncState<T>;
  reload: () => void;
} {
  const [nonce, setNonce] = useState(0);
  const [version, setVersion] = useState(dataVersion);
  const [result, setResult] = useState<{ key: string; state: AsyncState<T> } | null>(null);

  useEffect(() => subscribe(() => setVersion(dataVersion())), []);

  const key = JSON.stringify([deps, nonce, version]);

  useEffect(() => {
    let cancelled = false;
    fn()
      .then((data) => {
        if (!cancelled) setResult({ key, state: { status: 'ready', data } });
      })
      .catch((error: Error) => {
        if (!cancelled) setResult({ key, state: { status: 'error', error } });
      });
    return () => {
      cancelled = true;
    };
    // `fn` is a fresh closure on every render; `key` is what actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const state: AsyncState<T> = result?.key === key ? result.state : { status: 'loading' };

  return { state, reload };
}
