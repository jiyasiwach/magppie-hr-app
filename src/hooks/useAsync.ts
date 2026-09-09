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
 * Two keys, deliberately:
 *  - `depsKey` is what the caller asked for. When it changes the answer on
 *    screen is for the wrong question, so the loading state is correct.
 *  - `fetchKey` adds the store's version. When a mutation bumps it we refetch,
 *    but keep showing what is already there — otherwise every approval, punch
 *    or save would blank the screen and unmount any form the user is standing
 *    in, taking their half-typed input with it.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): {
  state: AsyncState<T>;
  reload: () => void;
} {
  const [nonce, setNonce] = useState(0);
  const [version, setVersion] = useState(dataVersion);
  const [result, setResult] = useState<{ depsKey: string; state: AsyncState<T> } | null>(null);

  useEffect(() => subscribe(() => setVersion(dataVersion())), []);

  const depsKey = JSON.stringify([deps, nonce]);
  const fetchKey = JSON.stringify([depsKey, version]);

  useEffect(() => {
    let cancelled = false;
    fn()
      .then((data) => {
        if (!cancelled) setResult({ depsKey, state: { status: 'ready', data } });
      })
      .catch((error: Error) => {
        if (!cancelled) setResult({ depsKey, state: { status: 'error', error } });
      });
    return () => {
      cancelled = true;
    };
    // `fn` is a fresh closure on every render; `fetchKey` is what actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const state: AsyncState<T> = result?.depsKey === depsKey ? result.state : { status: 'loading' };

  return { state, reload };
}
