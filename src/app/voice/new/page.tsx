'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, Card, PageHeader, Small, Stack } from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { raiseTicket } from '@/data/voice';
import { VOICE_MODULE_NAME } from '@/lib/constants';
import { voiceCategoryLabels } from '@/lib/labels';
import type { VoiceCategory, VoiceTicket } from '@/lib/types';
import s from '@/components/voice/voice.module.css';

const CATEGORIES: VoiceCategory[] = [
  'workplace',
  'pay-leave-attendance',
  'policy-process',
  'manager-team',
  'harassment',
  'suggestion',
  'other',
];

export default function RaiseTicketPage() {
  const { user } = useCurrentUser();
  const [category, setCategory] = useState<VoiceCategory>('workplace');
  const [anonymous, setAnonymous] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [raised, setRaised] = useState<VoiceTicket | null>(null);
  const [codeSaved, setCodeSaved] = useState(false);

  const isHarassment = category === 'harassment';

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const ticket = await raiseTicket(user, {
        category,
        anonymous,
        subject,
        body,
        attachmentName: attachmentName.trim() || null,
      });
      setRaised(ticket);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (raised) {
    return (
      <>
        <PageHeader title="Raised" description="Keep this reference. It is how you find this again." />
        <Stack>
          <Card title="Your reference code">
            <p className={s.code}>{raised.referenceCode}</p>
            {raised.anonymous ? (
              <>
                <p className={s.warn}>
                  <strong>Save this code now.</strong> This ticket was raised anonymously, which means
                  your identity was never attached to it — there is nothing stored that links it back
                  to you. That also means <strong>nobody can recover it for you</strong>. If you lose
                  this code, you lose access to the ticket and the conversation on it.
                </p>
                <label className={s.checkbox} style={{ marginTop: 12 }}>
                  <input type="checkbox" checked={codeSaved} onChange={(e) => setCodeSaved(e.target.checked)} />
                  I have written this code down somewhere safe
                </label>
                <p className={s.linkRow} style={{ marginTop: 12 }}>
                  {codeSaved ? (
                    <Link href="/voice/reference">Go to check by reference code</Link>
                  ) : (
                    <Small>
                      <span className={s.note}>Tick the box above once you have saved it.</span>
                    </Small>
                  )}
                </p>
              </>
            ) : (
              <p className={s.info}>
                This was raised confidentially. HR can see that it came from you, so they can follow up
                properly. Your manager cannot see it, and neither can anyone else.
                <br />
                <Link href={`/voice/${raised.id}`}>Open the ticket</Link>
              </p>
            )}
          </Card>

          <Card title="What happens next">
            <ul className={s.whatNext}>
              <li>
                {isHarassment
                  ? 'The Internal Committee has it. General HR cannot open it.'
                  : 'The HR team assigned to this module has it. Nobody else can open it.'}
              </li>
              <li>You will see the status change as it moves, and every reply lands in the thread.</li>
              <li>It cannot be closed without a written outcome — including if the answer is no.</li>
            </ul>
          </Card>
        </Stack>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Raise something with HR`}
        description={`${VOICE_MODULE_NAME} goes straight to HR. Your manager is never shown any part of it.`}
      />

      <Stack>
        <Card title="What is this about">
          <div className={s.choice}>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`${s.choiceCard} ${category === c ? s.choiceActive : ''}`}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                <span className={s.choiceTitle}>{voiceCategoryLabels[c]}</span>
              </button>
            ))}
          </div>

          {isHarassment ? (
            <p className={s.warn} style={{ marginTop: 16 }}>
              This goes to the <strong>Internal Committee</strong>, not to general HR. Nobody in HR
              outside the committee can open it, and it cannot be moved into the general queue by
              anyone. It is treated confidentially, and the committee works to defined timelines set
              out under the law. You may bring someone with you to any conversation about it.
            </p>
          ) : null}
        </Card>

        <Card title="Confidential or anonymous">
          <div className={s.choice}>
            <button
              type="button"
              className={`${s.choiceCard} ${!anonymous ? s.choiceActive : ''}`}
              aria-pressed={!anonymous}
              onClick={() => setAnonymous(false)}
            >
              <span className={s.choiceTitle}>Confidential</span>
              <span className={s.choiceBody}>
                HR sees that it came from you. Your manager does not. HR can reply to you directly and
                follow it up properly.
              </span>
            </button>
            <button
              type="button"
              className={`${s.choiceCard} ${anonymous ? s.choiceActive : ''}`}
              aria-pressed={anonymous}
              onClick={() => setAnonymous(true)}
            >
              <span className={s.choiceTitle}>Anonymous</span>
              <span className={s.choiceBody}>
                Your identity is not stored against the ticket at all. You get a reference code to
                follow it and to keep talking. If you lose the code, it cannot be recovered.
              </span>
            </button>
          </div>

          {anonymous ? (
            <p className={s.warn} style={{ marginTop: 16 }}>
              Anonymous here means your name is <strong>not recorded</strong>, not merely hidden from
              a screen. Nothing on the ticket links it to you — not your id, and not a timestamp
              precise enough to match a session. The cost is real: nobody can look it up for you, and
              HR cannot come back to you outside the thread.
            </p>
          ) : null}
        </Card>

        <Card title="Tell us what happened">
          <div className={s.form}>
            <div className={s.field}>
              <label className={s.label} htmlFor="v-subject">
                Subject
              </label>
              <input
                id="v-subject"
                type="text"
                value={subject}
                placeholder="One line, so it can be routed"
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="v-body">
                Detail
              </label>
              <textarea
                id="v-body"
                value={body}
                placeholder="What happened, when, and what you would like to see done."
                onChange={(e) => setBody(e.target.value)}
                style={{ minHeight: 160 }}
              />
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="v-file">
                Attachment (optional)
              </label>
              <input
                id="v-file"
                type="text"
                value={attachmentName}
                placeholder="File name — there is no file storage in this pass"
                onChange={(e) => setAttachmentName(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card title="Before you send">
          <ul className={s.whatNext}>
            <li>
              <strong>Who will see it:</strong>{' '}
              {isHarassment
                ? 'the Internal Committee only.'
                : 'the HR team assigned to this module only.'}{' '}
              Your manager will not, at any point.
            </li>
            <li>
              <strong>When:</strong> most tickets get a first reply within a few working days. You will
              see the status move as it does.
            </li>
            <li>
              <strong>How it ends:</strong> with a written outcome. If nothing can be done, it is
              closed with an honest reason rather than quietly marked resolved.
            </li>
          </ul>

          {error ? <p className={s.error} style={{ marginTop: 16 }}>{error}</p> : null}

          <div style={{ marginTop: 16 }}>
            <Button variant="primary" onClick={submit} disabled={busy || !subject.trim() || !body.trim()}>
              {busy ? 'Sending…' : anonymous ? 'Send anonymously' : 'Send confidentially'}
            </Button>
          </div>
        </Card>
      </Stack>
    </>
  );
}
