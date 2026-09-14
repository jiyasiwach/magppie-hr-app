'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, Card, PageHeader, Small, Stack } from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { ask, getConversation, startConversation } from '@/data/assistant';
import { useAsync } from '@/hooks/useAsync';
import { VOICE_MODULE_NAME } from '@/lib/constants';
import { formatTimestamp } from '@/lib/date';
import { policies } from '@/mocks';
import s from './assistant.module.css';

const SUGGESTIONS = [
  'How much leave do I have left?',
  'What happens if I forgot to punch out?',
  'When is the next holiday?',
  'What is the notice period?',
];

export default function AssistantPage() {
  const { user } = useCurrentUser();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    startConversation(user).then((c) => {
      if (!cancelled) setConversationId(c.id);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const { state } = useAsync(() => getConversation(user, conversationId), [user.employee.id, conversationId]);

  const send = async (text: string) => {
    if (!conversationId || !text.trim()) return;
    setBusy(true);
    try {
      await ask(user, conversationId, text);
      setQuestion('');
    } finally {
      setBusy(false);
    }
  };

  const messages = state.status === 'ready' && state.data ? state.data.messages : [];

  return (
    <>
      <PageHeader
        title="Ask HR"
        description="Routine questions about policy and your own records. It answers from what is written down, or says it does not know."
      />

      <Stack>
        <Card>
          <div className={s.thread}>
            {messages.length === 0 ? (
              <div className={s.intro}>
                <p>
                  I can answer from two places only: the policies published in this app, and your own
                  records. I will not guess, and I cannot see anyone else&rsquo;s data.
                </p>
                <p className={s.note}>
                  <Small>
                    For a grievance, anything about harassment, a pay dispute or a question about
                    notice, I will hand you over rather than answer. Those need a person.
                  </Small>
                </p>
                <div className={s.suggestions}>
                  {SUGGESTIONS.map((q) => (
                    <button key={q} type="button" className={s.suggestion} onClick={() => send(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((m) => (
              <div key={m.id} className={`${s.message} ${m.role === 'person' ? s.fromPerson : s.fromAssistant}`}>
                <span className={s.who}>{m.role === 'person' ? 'You' : 'Assistant'}</span>
                <span className={s.body}>{m.body}</span>

                {m.citations.length > 0 ? (
                  <span className={s.citations}>
                    {m.citations.map((id) => {
                      const policy = policies.find((p) => p.id === id);
                      return (
                        <Link key={id} href="/policies" className={s.citation}>
                          {policy ? `${policy.title} ${policy.version}` : id}
                        </Link>
                      );
                    })}
                  </span>
                ) : m.role === 'assistant' && !m.handoff ? (
                  <span className={s.noCitation}>
                    <Small>No policy cited — this came from your own records.</Small>
                  </span>
                ) : null}

                {m.handoff ? (
                  <span className={s.handoff}>
                    <Link href="/voice/new">Raise this with {VOICE_MODULE_NAME}</Link> — it goes
                    straight to the right people, and your manager never sees it.
                  </span>
                ) : null}

                <span className={s.time}>{formatTimestamp(m.createdOn)}</span>
              </div>
            ))}
          </div>

          <div className={s.composer}>
            <textarea
              value={question}
              aria-label="Ask a question"
              placeholder="Ask about leave, attendance, holidays or a policy"
              onChange={(e) => setQuestion(e.target.value)}
            />
            <Button variant="primary" onClick={() => send(question)} disabled={busy || !question.trim()}>
              {busy ? 'Thinking…' : 'Ask'}
            </Button>
          </div>
        </Card>

        <Card title="What this is, and is not">
          <ul className={s.rules}>
            <li>It answers from published policies and your own records. Nothing else.</li>
            <li>Every answer drawn from a policy links to that policy, so you can check it.</li>
            <li>
              If a rule is not written down anywhere, the answer is that it is not documented — not a
              plausible-sounding guess.
            </li>
            <li>It cannot see anyone else&rsquo;s data, including your team if you manage people.</li>
            <li>
              Conversations are logged so HR can see what people keep asking. That list is mostly
              useful as a list of what the policies fail to explain.
            </li>
            <li>
              <strong>No model is connected yet.</strong> The answers below come from a small set of
              mock responses. The behaviour around them — the refusals, the citations, the handoff —
              is the part that is real.
            </li>
          </ul>
        </Card>
      </Stack>
    </>
  );
}
