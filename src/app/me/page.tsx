'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import {
  AsyncSection,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  Stack,
  StatusPill,
} from '@/components/ui';
import {
  IconArchive,
  IconCalendar,
  IconChevronRight,
  IconClock,
  IconIdCard,
  IconInbox,
  IconPlus,
} from '@/components/ui/icons';
import { DocumentsPanel } from '@/components/documents/DocumentsPanel';
import { OrgDocuments } from '@/components/documents/OrgDocuments';
import { AssetsPanel } from '@/components/assets/AssetsPanel';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { getUpcomingHolidays } from '@/data/attendance';
import { useAsync } from '@/hooks/useAsync';
import { formatDate } from '@/lib/date';
import s from './me.module.css';

const TABS = [
  { id: 'time', label: 'Time' },
  { id: 'finances', label: 'Finances' },
  { id: 'documents', label: 'Documents' },
  { id: 'assets', label: 'Assets' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function MeScreen() {
  const { user } = useCurrentUser();
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get('tab') as TabId) ?? 'time';

  return (
    <>
      <PageHeader
        title="Me"
        description={`${user.employee.designation} · ${user.employee.department} · ${user.employee.employeeCode}`}
      />

      <div className={s.tabs} role="tablist" aria-label="Your sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`${s.tab} ${tab === t.id ? s.tabActive : ''}`}
            onClick={() => router.push(`/me?tab=${t.id}`)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'time' ? <TimeTab /> : null}
      {tab === 'finances' ? <FinancesTab /> : null}
      {tab === 'documents' ? <DocumentsTab employeeId={user.employee.id} /> : null}
      {tab === 'assets' ? <AssetsPanel employeeId={user.employee.id} /> : null}
    </>
  );
}

function ActionCard({
  href,
  title,
  body,
  Icon,
}: {
  href: string;
  title: string;
  body: string;
  Icon: (props: { size?: number }) => React.ReactElement;
}) {
  return (
    <Link href={href} className={s.actionCard}>
      <span className={s.actionIcon}>
        <Icon size={20} />
      </span>
      <span className={s.actionText}>
        <span className={s.actionTitle}>{title}</span>
        <span className={s.actionBody}>{body}</span>
      </span>
      <IconChevronRight size={18} />
    </Link>
  );
}

function TimeTab() {
  const { state, reload } = useAsync(() => getUpcomingHolidays(), []);

  return (
    <Stack>
      <Card title="Attendance">
        <div className={s.actionGrid}>
          <ActionCard
            href="/requests/new"
            title="Raise Request"
            body="Work from home, on duty, overtime, or a partial day."
            Icon={IconPlus}
          />
          <ActionCard
            href="/attendance"
            title="Logs and shifts"
            body="Every day, with the raw punches behind it."
            Icon={IconClock}
          />
          <ActionCard
            href="/requests"
            title="Request History"
            body="Everything you have raised, and where it got to."
            Icon={IconInbox}
          />
        </div>
      </Card>

      <Card title="Leave">
        <div className={s.actionGrid}>
          <ActionCard
            href="/leave/apply"
            title="Apply Leave"
            body="Dates, type, half days, and a reason."
            Icon={IconCalendar}
          />
          <ActionCard
            href="/leave"
            title="Leave Balances"
            body="Balance per type, and every transaction behind it."
            Icon={IconArchive}
          />
        </div>
      </Card>

      <Card title="Upcoming holidays" flush>
        <AsyncSection
          state={state}
          reload={reload}
          isEmpty={(rows) => rows.length === 0}
          empty={
            <EmptyState
              title="No holidays left this year"
              body="Next year's calendar appears here once HR publishes it."
            />
          }
        >
          {(rows) => (
            <ul className={s.holidayList}>
              {rows.map((h) => (
                <li key={h.id} className={s.holidayRow}>
                  <span className={s.holidayDate}>{formatDate(h.date)}</span>
                  <span>{h.name}</span>
                  {h.optional ? <StatusPill label="Optional" tone="quiet" /> : null}
                </li>
              ))}
            </ul>
          )}
        </AsyncSection>
      </Card>
    </Stack>
  );
}

function FinancesTab() {
  return (
    <Stack>
      <Card title="Salary">
        <EmptyState
          title="Salary is not set up yet"
          body="Payroll has not been configured for this company, so there is nothing to show. Once it is, your salary structure and payslips will appear here. Nothing in this build reads or stores pay data."
        />
      </Card>

      <Card title="Expenses" hint="Claims you have raised">
        <EmptyState
          title="Expense claims are not set up yet"
          body="There is no expense policy configured — no categories, no limits, no approval route. Until there is, claims cannot be raised. Your past claims will list here once it exists."
        />
        <p className={s.note}>
          Raising a claim is deliberately not available rather than shown and broken: an expense with no
          policy behind it has nothing to validate against.
        </p>
      </Card>
    </Stack>
  );
}

function DocumentsTab({ employeeId }: { employeeId: string }) {
  return (
    <Stack>
      <OrgDocuments />
      <DocumentsPanel employeeId={employeeId} />
      <Card title="Your ID card">
        <div className={s.actionGrid}>
          <ActionCard
            href="/me/id-card"
            title="View ID card"
            body="Your name, code, department and designation."
            Icon={IconIdCard}
          />
        </div>
      </Card>
    </Stack>
  );
}

export default function MePage() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" />}>
      <MeScreen />
    </Suspense>
  );
}
