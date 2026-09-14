'use client';

import { useState } from 'react';
import { Button, Card, PageHeader, Small, Stack, StatusPill } from '@/components/ui';
import { TicketThread } from '@/components/voice/TicketThread';
import { getTicketByReference } from '@/data/voice';
import { formatDate } from '@/lib/date';
import { voiceCategoryLabels, voiceStatusLabels, voiceStatusMeaning, voiceStatusTones } from '@/lib/labels';
import type { VoiceTicket } from '@/lib/types';
import s from '@/components/voice/voice.module.css';

/**
 * Reachable without any of the person's own tickets showing. This is the only
 * route back into an anonymous ticket, and it must not require knowing who they
 * are — that is the whole point.
 */
export default function ReferenceLookupPage() {
  const [code, setCode] = useState('');
  const [ticket, setTicket] = useState<VoiceTicket | null>(null);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);

  const look = async () => {
    setBusy(true);
    try {
      setTicket(await getTicketByReference(code));
      setSearched(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Check a ticket by reference code"
        description="For anything raised anonymously. Nothing here is linked to your account."
      />

      <Stack>
        <Card>
          <div className={s.form}>
            <div className={s.field}>
              <label className={s.label} htmlFor="ref-code">
                Reference code
              </label>
              <input
                id="ref-code"
                type="text"
                value={code}
                placeholder="VC-XXXXXX"
                onChange={(e) => setCode(e.target.value)}
                style={{ maxWidth: 280, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
              />
            </div>
            <div>
              <Button variant="primary" onClick={look} disabled={busy || code.trim().length < 4}>
                {busy ? 'Looking…' : 'Find it'}
              </Button>
            </div>
            <p className={s.note}>
              <Small>
                If the code is wrong there is nothing we can do to find the ticket for you. An
                anonymous ticket has nothing stored on it that points back to a person, including to
                you.
              </Small>
            </p>
          </div>
        </Card>

        {searched && !ticket ? (
          <Card>
            <p className={s.warn}>
              No ticket with that code. Check the characters — codes use digits and capitals, with no
              letter O or I to avoid confusion with zero and one.
            </p>
          </Card>
        ) : null}

        {ticket ? (
          <>
            <Card title={ticket.subject}>
              <div className={s.pills} style={{ justifyContent: 'flex-start' }}>
                <StatusPill label={voiceCategoryLabels[ticket.category]} tone="neutral" />
                <StatusPill
                  label={voiceStatusLabels[ticket.status]}
                  tone={voiceStatusTones[ticket.status]}
                />
              </div>
              <p className={s.note} style={{ marginTop: 12 }}>
                {voiceStatusMeaning[ticket.status]} · Raised {formatDate(ticket.createdOn.slice(0, 10))}
              </p>
              {ticket.statusNote ? <p className={s.info} style={{ marginTop: 12 }}>{ticket.statusNote}</p> : null}
              {ticket.closingNote ? (
                <p className={s.info} style={{ marginTop: 12 }}>
                  <strong>Outcome:</strong> {ticket.closingNote}
                </p>
              ) : null}
            </Card>

            <TicketThread ticket={ticket} asRaiser />
          </>
        ) : null}
      </Stack>
    </>
  );
}
