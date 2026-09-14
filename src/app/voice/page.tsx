'use client';

import Link from 'next/link';
import { ButtonLink, Card, EmptyState, PageHeader, Small, Stack } from '@/components/ui';
import { TicketQueue } from '@/components/voice/TicketQueue';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { getMyTickets, isCommitteeMember, isVoiceHandler } from '@/data/voice';
import { useAsync } from '@/hooks/useAsync';
import { VOICE_MODULE_NAME } from '@/lib/constants';
import s from './voice.module.css';

export default function MyVoicePage() {
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(() => getMyTickets(user), [user.employee.id]);
  const handler = isVoiceHandler(user);
  const committee = isCommitteeMember(user);

  return (
    <>
      <PageHeader
        title={VOICE_MODULE_NAME}
        description="Raise something with HR directly — a problem, a grievance, a suggestion, or a question. Your manager never sees any of it."
        actions={<ButtonLink href="/voice/new" variant="primary">Raise something</ButtonLink>}
      />

      <Stack>
        {handler || committee ? (
          <Card title="You also handle tickets">
            <div className={s.queueLinks}>
              {handler ? <Link href="/voice/hr">Open the HR queue</Link> : null}
              {committee ? <Link href="/voice/committee">Open the Internal Committee queue</Link> : null}
            </div>
            <p className={s.note}>
              <Small>
                You see these because you are assigned to them by name, not because of your role
                elsewhere in the app.
              </Small>
            </p>
          </Card>
        ) : null}

        <TicketQueue
          state={state}
          reload={reload}
          allowed
          deniedLabel="these tickets"
          showRaiser={false}
          empty={
            <EmptyState
              title="You have not raised anything"
              body="Anything you raise appears here with its status, and the conversation with HR stays on it."
            />
          }
        />

        <Card title="Raised anonymously?">
          <p className={s.note}>
            Anonymous tickets are not listed here, because nothing links them to you — that is the
            point. Use your reference code to find one.
          </p>
          <p className={s.linkRow}>
            <Link href="/voice/reference">Check a ticket by reference code</Link>
          </p>
        </Card>
      </Stack>
    </>
  );
}
