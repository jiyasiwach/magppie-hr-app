'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui';
import { IconSearch } from '@/components/ui/icons';
import { searchColleagues } from '@/data/team';
import { useAsync } from '@/hooks/useAsync';
import s from './shell.module.css';

/** The search field in the top bar. Two characters before it looks anything up. */
export function ColleagueSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const { state } = useAsync(() => searchColleagues(query), [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const results = state.status === 'ready' ? state.data : [];
  const searching = query.trim().length >= 2;

  return (
    <div className={s.search} ref={wrap}>
      <IconSearch size={16} className={s.searchIcon} />
      <input
        type="search"
        className={s.searchInput}
        value={query}
        placeholder="Find a colleague"
        aria-label="Find a colleague"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
      />
      {open && searching ? (
        <div className={s.searchResults}>
          {state.status === 'loading' ? (
            <p className={s.searchNote}>Looking…</p>
          ) : results.length === 0 ? (
            <p className={s.searchNote}>Nobody matches “{query.trim()}”.</p>
          ) : (
            <ul className={s.searchList}>
              {results.map((e) => (
                <li key={e.id}>
                  <Link href={`/directory/${e.id}`} className={s.searchResult} onClick={() => setOpen(false)}>
                    <Avatar name={e.fullName} size="sm" />
                    <span className={s.searchResultText}>
                      <span>{e.fullName}</span>
                      <span className={s.searchResultMeta}>
                        {e.designation} · {e.department}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
