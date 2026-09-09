'use client';

import { useState } from 'react';
import { Card, DataTable, NoAccessState, PageHeader, Small, Stack, StatusPill, type Column } from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { commit, reviewFlags } from '@/data/store';
import { formatDate } from '@/lib/date';
import { roleLabels } from '@/lib/auth';
import { canSeeSettings } from '@/lib/permissions';
import type { Holiday, LeaveType } from '@/lib/types';
import { holidays, leaveTypes, weeklyOffDays } from '@/mocks';
import s from './settings.module.css';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SettingsPage() {
  const { user } = useCurrentUser();
  const [, force] = useState(0);
  const isHr = canSeeSettings(user);

  const set = <K extends keyof typeof reviewFlags>(key: K, value: (typeof reviewFlags)[K]) => {
    reviewFlags[key] = value;
    commit();
    force((n) => n + 1);
  };

  const leaveColumns: Column<LeaveType>[] = [
    { key: 'name', header: 'Leave type', primary: true, render: (t) => t.name },
    { key: 'accrues', header: 'Accrues', render: (t) => (t.accrues ? 'Monthly' : 'No') },
    { key: 'half', header: 'Half days', render: (t) => (t.halfDaysAllowed ? 'Allowed' : 'Full days only') },
    { key: 'negative', header: 'Can go negative', render: (t) => (t.canGoNegative ? 'Yes' : 'No') },
  ];

  const holidayColumns: Column<Holiday>[] = [
    { key: 'date', header: 'Date', primary: true, render: (h) => formatDate(h.date) },
    { key: 'name', header: 'Holiday', render: (h) => h.name },
  ];

  return (
    <>
      <PageHeader title="Settings" description="Who you are signed in as, and how this build behaves while it is being reviewed." />

      <Stack>
        <Card title="You">
          <ul className={s.list}>
            <li>
              <span>Name</span>
              <strong>{user.employee.fullName}</strong>
            </li>
            <li>
              <span>Role</span>
              <strong>{roleLabels[user.role]}</strong>
            </li>
            <li>
              <span>Department</span>
              <strong>{user.employee.department}</strong>
            </li>
            <li>
              <span>Location</span>
              <strong>{user.employee.location}</strong>
            </li>
          </ul>
          <p className={s.note}>
            <Small>
              Role is derived, not stored — there is no role field in the data shapes. Anyone in Human
              Resources, plus anyone with no manager, counts as HR admin; anyone with direct reports
              counts as a manager. That rule is a placeholder and needs a real answer.
            </Small>
          </p>
        </Card>

        <Card title="Review aids" hint="These exist so the loading, empty and error states can be seen rather than taken on trust.">
          <div className={s.toggles}>
            <label className={s.toggle}>
              <input
                type="checkbox"
                checked={reviewFlags.simulateFailure}
                onChange={(e) => set('simulateFailure', e.target.checked)}
              />
              <span>
                Make every read and write fail
                <br />
                <Small>
                  <span className={s.muted}>Shows the error state on every screen.</span>
                </Small>
              </span>
            </label>
            <label className={s.toggle}>
              <input
                type="checkbox"
                checked={reviewFlags.simulateEmpty}
                onChange={(e) => set('simulateEmpty', e.target.checked)}
              />
              <span>
                Return an empty directory
                <br />
                <Small>
                  <span className={s.muted}>Shows the empty state on the directory list.</span>
                </Small>
              </span>
            </label>
            <label className={s.toggle}>
              <input
                type="checkbox"
                checked={reviewFlags.latencyMs > 800}
                onChange={(e) => set('latencyMs', e.target.checked ? 1500 : 220)}
              />
              <span>
                Slow everything down
                <br />
                <Small>
                  <span className={s.muted}>Holds the loading state long enough to look at.</span>
                </Small>
              </span>
            </label>
          </div>
          <p className={s.note}>
            <Small>These are mock-only and are removed with the mock data layer.</Small>
          </p>
        </Card>

        <Card title="Organisation settings" hint="HR admin only">
          {isHr ? (
            <Stack>
              <div>
                <h3 className={s.subheading}>Leave types</h3>
                <DataTable rows={leaveTypes} columns={leaveColumns} rowKey={(t) => t.id} caption="Leave types" />
              </div>
              <div>
                <h3 className={s.subheading}>Weekly off</h3>
                <p className={s.plain}>
                  {weeklyOffDays.map((d) => DAY_NAMES[d]).join(' and ')}.{' '}
                  <StatusPill label="Same for everyone" tone="quiet" />
                </p>
                <p className={s.note}>
                  <Small>
                    The factory almost certainly does not run the same week as the showrooms. Per-location
                    or per-shift weekly offs are not modelled — flagged, not decided.
                  </Small>
                </p>
              </div>
              <div>
                <h3 className={s.subheading}>Holiday calendar</h3>
                <DataTable rows={holidays} columns={holidayColumns} rowKey={(h) => h.date} caption="Holidays" />
                <p className={s.note}>
                  <Small>
                    One national list. Whether Mumbai and NCR share a holiday calendar has not been
                    stated.
                  </Small>
                </p>
              </div>
              <p className={s.note}>
                <Small>Nothing here is editable in this pass — these are the values the screens read.</Small>
              </p>
            </Stack>
          ) : (
            <NoAccessState what="organisation settings" />
          )}
        </Card>
      </Stack>
    </>
  );
}
