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
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): {
  state: AsyncState<T>;
  reload: () => void;
} {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);
  const [version, setVersion] = useState(dataVersion);

  useEffect(() => subscribe(() => setVersion(dataVersion())), []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fn()
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ status: 'error', error });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, version]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { state, reload };
}
