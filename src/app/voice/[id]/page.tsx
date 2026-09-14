'use client';

import { use, useState } from 'react';
import {
  AsyncSection,
  Button,
  Card,
  EmptyState,
  Grid,
  Metric,
  PageHeader,
  Small,
  Stack,
  StatusPill,
} from '@/components/ui';
import { TicketThread } from '@/components/voice/TicketThread';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { findEmployeeSync } from '@/data/directory';
import {
  ageInDays,
  assignTicket,
  assignableFor,
  getTicket,
  isCommitteeMember,
  isVoiceHandler,
  setTicketStatus,
} from '@/data/voice';
import { useAsync } from '@/hooks/useAsync';
import { formatDate, formatTimestamp } from '@/lib/date';
import { voiceCategoryLabels, voiceStatusLabels, voiceStatusMeaning, voiceStatusTones } from '@/lib/labels';
import type { VoiceStatus, VoiceTicket } from '@/lib/types';
import s from '@/components/voice/voice.module.css';

const STATUSES: VoiceStatus[] = [
  'submitted',
  'in-review',
  'action-being-taken',
  'resolved',
  'closed-without-action',
];

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(() => getTicket(user, id), [user.employee.id, id]);

  return (
    <AsyncSection
      state={state}
      reload={reload}
      isEmpty={(t) => t === null}
      empty={
        <EmptyState
          title="Not available to you"
          body="Either this ticket does not exist, or it is not one you are allowed to see. Tickets are visible to the person who raised them and to the team handling them — nobody else, including managers."
        />
      }
      loadingRows={4}
    >
      {(ticket) => {
        if (!ticket) return null;
        const isRaiser = !ticket.anonymous && ticket.raiserId === user.employee.id;
        const canHandle =
          ticket.category === 'harassment' ? isCommitteeMember(user) : isVoiceHandler(user);

        return (
          <>
            <PageHeader
              title={ticket.subject}
              description={`${ticket.referenceCode} · raised ${formatDate(ticket.createdOn.slice(0, 10))}`}
            />
            <Stack>
              <Card>
                <div className={s.pills} style={{ justifyContent: 'flex-start' }}>
                  <StatusPill label={voiceCategoryLabels[ticket.category]} tone="neutral" />
                  <StatusPill label={voiceStatusLabels[ticket.status]} tone={voiceStatusTones[ticket.status]} />
                  {ticket.anonymous ? <StatusPill label="Raised anonymously" tone="info" /> : null}
                </div>
                <p className={s.note} style={{ marginTop: 12 }}>
                  {voiceStatusMeaning[ticket.status]}
                </p>
                {ticket.statusNote ? <p className={s.info} style={{ marginTop: 12 }}>{ticket.statusNote}</p> : null}
                {ticket.closingNote ? (
                  <p className={s.info} style={{ marginTop: 12 }}>
                    <strong>Outcome:</strong> {ticket.closingNote}
                    {ticket.closedOn ? ` — ${formatTimestamp(ticket.closedOn)}` : ''}
                  </p>
                ) : null}
                {canHandle ? (
                  <Grid>
                    <Metric value={ageInDays(ticket)} label="Days since raised" />
                    <Metric
                      value={ticket.firstResponseOn ? formatDate(ticket.firstResponseOn.slice(0, 10)) : 'None'}
                      label="First reply"
                    />
                    <Metric
                      value={
                        ticket.assignedTo
                          ? (findEmployeeSync(ticket.assignedTo)?.fullName ?? ticket.assignedTo)
                          : 'Nobody'
                      }
                      label="Assigned to"
                    />
                  </Grid>
                ) : null}
              </Card>

              {canHandle ? <HandlerControls ticket={ticket} /> : null}

              <TicketThread ticket={ticket} asRaiser={isRaiser} />
            </Stack>
          </>
        );
      }}
    </AsyncSection>
  );
}

function HandlerControls({ ticket }: { ticket: VoiceTicket }) {
  const { user } = useCurrentUser();
  const [status, setStatus] = useState<VoiceStatus>(ticket.status);
  const [note, setNote] = useState('');
  const [assignee, setAssignee] = useState(ticket.assignedTo ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { state } = useAsync(() => assignableFor(ticket), [ticket.id]);

  const needsNote =
    status === 'resolved' || status === 'closed-without-action' || status === 'action-being-taken';

  const save = async () => {
    setError(null);
    setBusy(true);
    try {
      await setTicketStatus(user, ticket.id, status, note);
      setNote('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const assign = async () => {
    if (!assignee) return;
    setError(null);
    setBusy(true);
    try {
      await assignTicket(user, ticket.id, assignee);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const candidates = state.status === 'ready' ? state.data : [];

  return (
    <Card title="Handle this" hint="Nothing closes without a written outcome.">
      <div className={s.handler}>
        <div className={s.handlerRow}>
          <div className={s.field}>
            <label className={s.label} htmlFor="t-status">
              Status
            </label>
            <select id="t-status" value={status} onChange={(e) => setStatus(e.target.value as VoiceStatus)}>
              {STATUSES.map((v) => (
                <option key={v} value={v}>
                  {voiceStatusLabels[v]}
                </option>
              ))}
            </select>
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="t-assign">
              Assign to
            </label>
            <select id="t-assign" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">Nobody</option>
              {candidates.map((c) => (
                <option key={c} value={c}>
                  {findEmployeeSync(c)?.fullName ?? c}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={assign} disabled={busy || !assignee}>
            Assign
          </Button>
        </div>

        <div className={s.field}>
          <label className={s.label} htmlFor="t-note">
            {status === 'resolved'
              ? 'What was done — required'
              : status === 'closed-without-action'
                ? 'Why nothing was done — required, and be honest'
                : status === 'action-being-taken'
                  ? 'What is being done — required'
                  : 'Note (optional)'}
          </label>
          <textarea id="t-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {error ? <p className={s.error}>{error}</p> : null}

        <div>
          <Button variant="primary" onClick={save} disabled={busy || (needsNote && !note.trim())}>
            {busy ? 'Saving…' : 'Update status'}
          </Button>
        </div>

        <p className={s.note}>
          <Small>
            Closing something people can see was not resolved, without saying why, destroys trust in
            this channel faster than anything else. &ldquo;Closed without action&rdquo; is a real
            outcome — use it honestly rather than marking things resolved.
          </Small>
        </p>
      </div>
    </Card>
  );
}
