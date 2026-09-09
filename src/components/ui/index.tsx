'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AsyncState } from '@/hooks/useAsync';
import type { Tone } from '@/lib/labels';
import s from './ui.module.css';

// --- layout ----------------------------------------------------------------

export function Stack({ children, tight }: { children: ReactNode; tight?: boolean }) {
  return <div className={tight ? s.stackTight : s.stack}>{children}</div>;
}

export function Row({ children }: { children: ReactNode }) {
  return <div className={s.row}>{children}</div>;
}

export function Grid({ children }: { children: ReactNode }) {
  return <div className={s.grid2}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className={s.pageHeader}>
      <div className={s.pageHeaderText}>
        <h1>{title}</h1>
        {description ? <p className={s.pageDescription}>{description}</p> : null}
      </div>
      {actions ? <div className={s.pageActions}>{actions}</div> : null}
    </header>
  );
}

export function Card({
  title,
  hint,
  actions,
  children,
  flush,
}: {
  title?: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
}) {
  return (
    <section className={s.card}>
      {title ? (
        <div className={s.cardHeader}>
          <div className={s.cardTitle}>
            <h2>{title}</h2>
            {hint ? <span className={s.cardHint}>{hint}</span> : null}
          </div>
          {actions}
        </div>
      ) : null}
      <div className={flush ? s.cardBodyFlush : s.cardBody}>{children}</div>
    </section>
  );
}

export function Metric({ value, label, note }: { value: ReactNode; label: string; note?: ReactNode }) {
  return (
    <div className={s.metric}>
      <span className={s.metricValue}>{value}</span>
      <span className={s.metricLabel}>{label}</span>
      {note}
    </div>
  );
}

// --- buttons ---------------------------------------------------------------

type ButtonVariant = 'default' | 'primary' | 'quiet';

export function Button({
  children,
  onClick,
  variant = 'default',
  large,
  disabled,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  large?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const classes = [s.button];
  if (variant === 'primary') classes.push(s.buttonPrimary);
  if (variant === 'quiet') classes.push(s.buttonQuiet);
  if (large) classes.push(s.buttonLarge);
  return (
    <button type={type} className={classes.join(' ')} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  variant = 'default',
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
}) {
  const classes = [s.button];
  if (variant === 'primary') classes.push(s.buttonPrimary);
  if (variant === 'quiet') classes.push(s.buttonQuiet);
  return (
    <Link href={href} className={classes.join(' ')}>
      {children}
    </Link>
  );
}

// --- the four required states ---------------------------------------------

export function LoadingState({ label = 'Loading…', rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div className={s.state} role="status" aria-live="polite">
      <span className={s.stateTitle}>{label}</span>
      <div className={s.skeletonRows} aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={s.skeleton} style={{ width: `${90 - i * 12}%` }} />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className={s.state}>
      <span className={s.stateTitle}>{title}</span>
      {body ? <p className={s.stateBody}>{body}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className={s.state} role="alert">
      <span className={s.stateTitle}>Something went wrong</span>
      <p className={s.stateBody}>{error.message}</p>
      {onRetry ? (
        <Button onClick={onRetry} variant="quiet">
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function NoAccessState({ what = 'this' }: { what?: string }) {
  return (
    <div className={s.state}>
      <span className={s.stateTitle}>You do not have access to {what}</span>
      <p className={s.stateBody}>
        Your role can see your own records and, if you manage people, your team&rsquo;s. Ask HR if you
        believe you should see more.
      </p>
    </div>
  );
}

/**
 * Wraps any async read in the four states rule 4.4 requires. Screens pass an
 * `isEmpty` test so "loaded but nothing there" never renders as a blank box.
 */
export function AsyncSection<T>({
  state,
  reload,
  isEmpty,
  empty,
  children,
  loadingRows,
  allowed = true,
  deniedLabel,
}: {
  state: AsyncState<T>;
  reload?: () => void;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
  loadingRows?: number;
  allowed?: boolean;
  deniedLabel?: string;
}) {
  if (!allowed) return <NoAccessState what={deniedLabel} />;
  if (state.status === 'loading') return <LoadingState rows={loadingRows} />;
  if (state.status === 'error') return <ErrorState error={state.error} onRetry={reload} />;
  if (isEmpty?.(state.data)) {
    return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;
  }
  return <>{children(state.data)}</>;
}

// --- status pill -----------------------------------------------------------

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const classes = [s.pill];
  if (tone === 'success') classes.push(s.pillSuccess);
  if (tone === 'warning') classes.push(s.pillWarning);
  if (tone === 'danger') classes.push(s.pillDanger);
  if (tone === 'info') classes.push(s.pillInfo);
  if (tone === 'quiet') classes.push(s.pillQuiet);
  return <span className={classes.join(' ')}>{label}</span>;
}

// --- filters ---------------------------------------------------------------

export interface SelectFilter {
  key: string;
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export function FilterBar({
  search,
  filters,
  resultCount,
  onClear,
}: {
  search?: { value: string; onChange: (value: string) => void; placeholder?: string };
  filters: SelectFilter[];
  resultCount?: string;
  onClear?: () => void;
}) {
  return (
    <div className={s.filterBar}>
      {search ? (
        <div className={s.filterField}>
          <label className={s.label} htmlFor="filter-search">
            Search
          </label>
          <input
            id="filter-search"
            type="search"
            value={search.value}
            placeholder={search.placeholder ?? 'Name, code or email'}
            onChange={(e) => search.onChange(e.target.value)}
          />
        </div>
      ) : null}
      {filters.map((f) => (
        <div className={s.filterField} key={f.key}>
          <label className={s.label} htmlFor={`filter-${f.key}`}>
            {f.label}
          </label>
          <select id={`filter-${f.key}`} value={f.value} onChange={(e) => f.onChange(e.target.value)}>
            <option value="">All</option>
            {f.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      ))}
      {resultCount || onClear ? (
        <div className={s.filterFooter}>
          <span>{resultCount}</span>
          {onClear ? (
            <Button variant="quiet" onClick={onClear}>
              Clear filters
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// --- table with a mobile card view ----------------------------------------

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Shown on the mobile card as the headline rather than a key/value row. */
  primary?: boolean;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  caption,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  caption: string;
}) {
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary);

  return (
    <>
      <div className={`${s.tableWrap} ${s.hideOnMobile}`}>
        <table className={s.table}>
          <caption className="visually-hidden">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => (
                  <td key={c.key}>{c.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className={`${s.cardList} ${s.showOnMobile}`} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map((row) => (
          <li key={rowKey(row)} className={s.cardListItem}>
            <div>{primary.render(row)}</div>
            {rest.map((c) => (
              <div key={c.key} className={s.cardListRow}>
                <span className={s.cardListKey}>{c.header}</span>
                <span>{c.render(row)}</span>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </>
  );
}

// --- "show the working" ----------------------------------------------------

/**
 * Rule 6: wherever a number is calculated, this sits next to it and shows how
 * it was worked out.
 */
export function Working({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className={s.disclosure}>
      <summary className={s.disclosureSummary}>{summary}</summary>
      <div className={s.disclosureBody}>{children}</div>
    </details>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <span className={s.muted}>{children}</span>;
}

export function Small({ children }: { children: ReactNode }) {
  return <span className={s.small}>{children}</span>;
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className={s.mono}>{children}</span>;
}

export { s as uiStyles };
