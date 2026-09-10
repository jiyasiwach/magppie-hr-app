'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  AsyncSection,
  Avatar,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Stack,
  StatusPill,
} from '@/components/ui';
import {
  IconCalendar,
  IconChevronRight,
  IconHome,
  IconMegaphone,
  IconPlus,
} from '@/components/ui/icons';
import { TodayCard } from '@/components/home/TodayCard';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { getAnnouncements, canPostAnnouncement, createAnnouncement, getCelebrations } from '@/data/workplace';
import { getUpcomingHolidays } from '@/data/attendance';
import { getAwayThisWeek, currentWeek } from '@/data/team';
import { findEmployeeSync } from '@/data/directory';
import { useAsync } from '@/hooks/useAsync';
import { MOCK_TODAY } from '@/lib/clock';
import { formatDate, formatDayName } from '@/lib/date';
import { visibleEmployeeIds } from '@/lib/permissions';
import s from '@/components/home/home.module.css';

export default function HomePage() {
  const { user } = useCurrentUser();
  const first = user.employee.fullName.split(' ')[0];

  return (
    <>
      <PageHeader
        title={`Hello, ${first}`}
        description={`${formatDayName(MOCK_TODAY)}, ${formatDate(MOCK_TODAY)} — everything on this screen comes from mock data.`}
      />

      <Stack>
        <QuickActions />
        <TodayCard employeeId={user.employee.id} />
        <OffThisWeek />
        <WishThem />
        <Announcements />
        <UpcomingHolidays />
      </Stack>
    </>
  );
}

function QuickActions() {
  const actions = [
    { href: '/leave/apply', label: 'Apply Leave', Icon: IconCalendar },
    { href: '/requests/new?type=wfh', label: 'Apply WFH', Icon: IconHome },
    { href: '/leave', label: 'Leave Balance', Icon: IconPlus },
  ];
  return (
    <div className={s.quickActions}>
      {actions.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={s.quickAction}>
          <span className={s.quickActionCircle}>
            <Icon size={22} />
          </span>
          {label}
        </Link>
      ))}
    </div>
  );
}

function OffThisWeek() {
  const { user } = useCurrentUser();
  const week = currentWeek();
  const { state, reload } = useAsync(
    () => getAwayThisWeek(visibleEmployeeIds(user)),
    [user.employee.id],
  );

  return (
    <AsyncSection state={state} reload={reload} loadingRows={1}>
      {(away) => (
        <Link href="/team" className={s.rowLink}>
          <span className={s.rowText}>
            <span className={s.rowTitle}>
              {away.length === 0
                ? 'Nobody is off this week'
                : `${away.length} ${away.length === 1 ? 'person is' : 'people are'} off this week`}
            </span>
            <span className={s.rowMeta}>
              {formatDate(week.start)} – {formatDate(week.end)}
              {away.length > 0 ? ` · ${away.map((a) => a.employee.fullName.split(' ')[0]).join(', ')}` : ''}
            </span>
          </span>
          <span className={s.faces}>
            {away.slice(0, 4).map((a) => (
              <Avatar key={a.employee.id} name={a.employee.fullName} size="sm" />
            ))}
            <IconChevronRight size={18} />
          </span>
        </Link>
      )}
    </AsyncSection>
  );
}

function WishThem() {
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(() => getCelebrations(), []);

  return (
    <Card title="Wish them" hint="Birthdays and work anniversaries coming up">
      <AsyncSection
        state={state}
        reload={reload}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            title="Nothing coming up"
            body="Birthdays and work anniversaries in the next three weeks appear here."
          />
        }
        loadingRows={2}
      >
        {(rows) => (
          <div className={s.strip}>
            {rows.slice(0, 12).map((c) => (
              <Link
                key={`${c.employee.id}-${c.kind}`}
                href={`/wall?wish=${c.employee.id}&kind=${c.kind}`}
                className={s.wishCard}
              >
                <Avatar name={c.employee.fullName} size="lg" />
                <StatusPill
                  label={c.kind === 'birthday' ? 'Birthday' : `${c.years} years`}
                  tone={c.kind === 'birthday' ? 'info' : 'success'}
                />
                <span className={s.wishName}>
                  {c.employee.id === user.employee.id ? 'You' : c.employee.fullName}
                </span>
                <span className={s.wishMeta}>{formatDate(c.onDate)}</span>
              </Link>
            ))}
          </div>
        )}
      </AsyncSection>
    </Card>
  );
}

function Announcements() {
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(() => getAnnouncements(), []);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const mayPost = canPostAnnouncement(user);

  const post = async () => {
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    try {
      await createAnnouncement(user.employee.id, title.trim(), body.trim());
      setTitle('');
      setBody('');
      setComposing(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Announcements"
      hint="Company-wide notices"
      flush
      actions={
        mayPost ? (
          <Button onClick={() => setComposing((v) => !v)}>
            {composing ? 'Cancel' : 'New announcement'}
          </Button>
        ) : null
      }
    >
      {composing ? (
        <div className={s.composer}>
          <input
            type="text"
            value={title}
            placeholder="Title"
            aria-label="Announcement title"
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            value={body}
            placeholder="What do people need to know?"
            aria-label="Announcement body"
            onChange={(e) => setBody(e.target.value)}
          />
          <Button variant="primary" onClick={post} disabled={busy || !title.trim() || !body.trim()}>
            {busy ? 'Posting…' : 'Post announcement'}
          </Button>
        </div>
      ) : null}

      <AsyncSection
        state={state}
        reload={reload}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            title="No announcements"
            body={
              mayPost
                ? 'Notices you post to the whole company will show here.'
                : 'Company-wide notices from HR and department heads will show here.'
            }
          />
        }
      >
        {(rows) => (
          <div>
            {rows.map((a) => {
              const author = findEmployeeSync(a.authorId);
              return (
                <article key={a.id} className={s.announcement}>
                  <span className={s.announcementTitle}>
                    <IconMegaphone size={16} /> {a.title}
                  </span>
                  <p className={s.announcementBody}>{a.body}</p>
                  <span className={s.announcementMeta}>
                    {author?.fullName ?? a.authorId} · {formatDate(a.postedOn.slice(0, 10))}
                  </span>
                </article>
              );
            })}
          </div>
        )}
      </AsyncSection>
    </Card>
  );
}

function UpcomingHolidays() {
  const { state, reload } = useAsync(() => getUpcomingHolidays(6), []);
  return (
    <Card
      title="Upcoming holidays"
      actions={
        <Link href="/me?tab=time" className={s.todayFooterLink}>
          See all
        </Link>
      }
    >
      <AsyncSection
        state={state}
        reload={reload}
        isEmpty={(rows) => rows.length === 0}
        empty={<EmptyState title="No holidays left this year" body="Next year's calendar appears here once HR publishes it." />}
        loadingRows={1}
      >
        {(rows) => (
          <div className={s.strip}>
            {rows.map((h) => (
              <div key={h.id} className={s.holidayCard}>
                <span className={s.holidayDate}>{formatDate(h.date)}</span>
                <span className={s.holidayName}>{h.name}</span>
                {h.optional ? <StatusPill label="Optional" tone="quiet" /> : null}
              </div>
            ))}
          </div>
        )}
      </AsyncSection>
    </Card>
  );
}
