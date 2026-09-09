'use client';

import { useState } from 'react';
import { Button, Card, PageHeader, Small, Stack } from '@/components/ui';
import s from './feedback.module.css';

export default function FeedbackPage() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <>
      <PageHeader title="Send feedback" description="Tell us what is wrong or missing." />
      <Stack>
        <Card>
          <div className={s.form}>
            <div className={s.field}>
              <label className={s.label} htmlFor="fb-subject">
                Subject
              </label>
              <input
                id="fb-subject"
                type="text"
                value={subject}
                placeholder="What is this about?"
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="fb-body">
                Detail
              </label>
              <textarea id="fb-body" value={body} onChange={(e) => setBody(e.target.value)} />
            </div>

            {sent ? (
              <p className={s.warn}>
                Nothing was sent. There is nowhere for this to go yet — no inbox, no ticket queue, no
                email. Whoever should receive feedback has not been decided.
              </p>
            ) : null}

            <Button variant="primary" onClick={() => setSent(true)} disabled={!subject.trim() || !body.trim()}>
              Send feedback
            </Button>

            <p className={s.note}>
              <Small>
                Left deliberately unwired rather than made to look successful: a feedback box that
                silently discards what people write is worse than one that says so.
              </Small>
            </p>
          </div>
        </Card>
      </Stack>
    </>
  );
}
