'use client';

import { useState } from 'react';
import { AsyncSection, Button, Card, EmptyState, Muted, Small, StatusPill } from '@/components/ui';
import { acknowledgePolicy, getPolicies } from '@/data/documents';
import { useAsync } from '@/hooks/useAsync';
import { formatDate, formatTimestamp } from '@/lib/date';
import s from './documents.module.css';

export function PolicyList({ employeeId, readOnly = false }: { employeeId: string; readOnly?: boolean }) {
  const { state, reload } = useAsync(() => getPolicies(employeeId), [employeeId]);
  const [open, setOpen] = useState<string | null>(null);
  const [read, setRead] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = (policyId: string) => {
    setOpen((current) => (current === policyId ? null : policyId));
    setRead((current) => new Set(current).add(policyId));
  };

  const acknowledge = async (policyId: string) => {
    setBusy(policyId);
    try {
      await acknowledgePolicy(policyId, employeeId);
      setOpen(null);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card
      title="Policy acknowledgements"
      hint="Open the policy, read it, then acknowledge. The date is recorded against your name."
    >
      <AsyncSection
        state={state}
        reload={reload}
        isEmpty={(rows) => rows.length === 0}
        empty={<EmptyState title="No policies published" />}
      >
        {(rows) => (
          <ul className={s.list}>
            {rows.map(({ policy, acknowledgement }) => {
              const isOpen = open === policy.id;
              const hasRead = read.has(policy.id);
              return (
                <li key={policy.id} className={s.policy}>
                  <div className={s.item}>
                    <div className={s.itemMain}>
                      <span className={s.fileName}>
                        {policy.title} <Muted>{policy.version}</Muted>
                      </span>
                      <span className={s.meta}>{policy.summary}</span>
                      <span className={s.meta}>
                        Published {formatDate(policy.publishedOn)}
                        {acknowledgement
                          ? ` · Acknowledged ${formatTimestamp(acknowledgement.acknowledgedOn)}`
                          : ''}
                      </span>
                    </div>
                    <div className={s.itemActions}>
                      {acknowledgement ? (
                        <StatusPill label="Acknowledged" tone="success" />
                      ) : (
                        <StatusPill label="Not acknowledged" tone="warning" />
                      )}
                      <Button onClick={() => toggle(policy.id)}>{isOpen ? 'Close' : 'Read'}</Button>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className={s.policyBody}>
                      {policy.body.map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                      ))}
                      {!acknowledgement && !readOnly ? (
                        <div className={s.policyActions}>
                          <Button
                            variant="primary"
                            onClick={() => acknowledge(policy.id)}
                            disabled={busy === policy.id || !hasRead}
                          >
                            {busy === policy.id ? 'Recording…' : 'I have read and acknowledge this'}
                          </Button>
                          <Muted>
                            <Small>
                              Acknowledging records your name and the date. It cannot be undone from
                              here.
                            </Small>
                          </Muted>
                        </div>
                      ) : null}
                      {readOnly ? (
                        <p className={s.meta}>
                          You are looking at someone else&rsquo;s record — only they can acknowledge a
                          policy for themselves.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </AsyncSection>
      <p className={s.note} style={{ marginTop: 12 }}>
        <Small>
          Policy text here is placeholder wording written for this build, not the company&rsquo;s actual
          policies. Where the approved text lives, and who publishes a new version, has not been
          decided.
        </Small>
      </p>
    </Card>
  );
}
