'use client';

import { useState } from 'react';
import { AsyncSection, Button, Card, Small } from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { findEmployeeSync } from '@/data/directory';
import { addRaiserMessage, getMessages, isCommitteeMember, isVoiceHandler, replyToTicket } from '@/data/voice';
import { useAsync } from '@/hooks/useAsync';
import { formatTimestamp } from '@/lib/date';
import type { VoiceTicket } from '@/lib/types';
import s from './voice.module.css';

export function TicketThread({ ticket, asRaiser }: { ticket: VoiceTicket; asRaiser: boolean }) {
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(() => getMessages(ticket.id), [ticket.id]);
  const [body, setBody] = useState('');
  const [identify, setIdentify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canHandle =
    ticket.category === 'harassment' ? isCommitteeMember(user) : isVoiceHandler(user);
  const closed = ticket.status === 'resolved' || ticket.status === 'closed-without-action';

  const send = async () => {
    setError(null);
    setBusy(true);
    try {
      if (asRaiser) await addRaiserMessage(ticket.id, body, ticket.raiserId);
      else await replyToTicket(user, ticket.id, body, identify);
      setBody('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Conversation">
      <AsyncSection state={state} reload={reload} loadingRows={3}>
        {(messages) => (
          <div className={s.thread}>
            {messages.map((m) => {
              const author = findEmployeeSync(m.authorId);
              return (
                <div
                  key={m.id}
                  className={`${s.message} ${m.authorType === 'hr' ? s.fromHr : s.fromRaiser}`}
                >
                  <span className={s.messageWho}>
                    {m.authorType === 'hr'
                      ? (author?.fullName ?? 'HR team')
                      : ticket.anonymous
                        ? 'Raised anonymously'
                        : (author?.fullName ?? 'You')}
                  </span>
                  <span className={s.messageTime}>{formatTimestamp(m.createdOn)}</span>
                  <span className={s.messageBody}>{m.body}</span>
                </div>
              );
            })}

            {closed ? (
              <p className={s.info}>
                This ticket is closed. The conversation stays readable, but nothing more can be added.
              </p>
            ) : asRaiser || canHandle ? (
              <div className={s.composer}>
                <textarea
                  value={body}
                  aria-label="Add to the conversation"
                  placeholder={asRaiser ? 'Add anything else that would help' : 'Reply to the person who raised this'}
                  onChange={(e) => setBody(e.target.value)}
                />
                {error ? <p className={s.error}>{error}</p> : null}
                <div className={s.composerRow}>
                  <Button variant="primary" onClick={send} disabled={busy || !body.trim()}>
                    {busy ? 'Sending…' : 'Send'}
                  </Button>
                  {!asRaiser ? (
                    <label className={s.checkbox}>
                      <input
                        type="checkbox"
                        checked={identify}
                        onChange={(e) => setIdentify(e.target.checked)}
                      />
                      Sign this with my name
                    </label>
                  ) : null}
                </div>
                {!asRaiser ? (
                  <p className={s.meta}>
                    <Small>
                      Replies show as coming from the HR team unless you choose to be named.
                    </Small>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </AsyncSection>
    </Card>
  );
}
