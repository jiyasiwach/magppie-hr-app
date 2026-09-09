'use client';

import { useState } from 'react';
import { AsyncSection, Button, Card, EmptyState, Muted, Small, StatusPill } from '@/components/ui';
import { acknowledgePolicy, getPolicies } from '@/data/documents';
import { useAsync } from '@/hooks/useAsync';
import { formatDate, formatTimestamp } from '@/lib/date';
import s from './documents.module.css';

export function PolicyList({ employeeId, readOnly = false }: { employeeId: string; readOnly?: boolean }) {
  const { state, reload } = useAsync(() => getPolicies(employeeId), [employeeId]);
  const [busy, setBusy] = useState<string | null>(null);

  const acknowledge = async (policyId: string) => {
    setBusy(policyId);
    try {
      await acknowledgePolicy(policyId, employeeId);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card title="Policy acknowledgements" hint="Read the policy, then acknowledge it. The date is recorded.">
      <AsyncSection
        state={state}
        reload={reload}
        isEmpty={(rows) => rows.length === 0}
        empty={<EmptyState title="No policies published" />}
      >
        {(rows) => (
          <ul className={s.list}>
            {rows.map(({ policy, acknowledgement }) => (
              <li key={policy.id} className={s.item}>
                <div className={s.itemMain}>
                  <span className={s.fileName}>
                    {policy.title} <Muted>{policy.version}</Muted>
                  </span>
                  <span className={s.meta}>{policy.summary}</span>
                  <span className={s.meta}>
                    Published {formatDate(policy.publishedOn)}
                    {acknowledgement ? ` · Acknowledged ${formatTimestamp(acknowledgement.acknowledgedOn)}` : ''}
                  </span>
                </div>
                <div className={s.itemActions}>
                  {acknowledgement ? (
                    <StatusPill label="Acknowledged" tone="success" />
                  ) : readOnly ? (
                    <StatusPill label="Not acknowledged" tone="warning" />
                  ) : (
                    <Button
                      onClick={() => acknowledge(policy.id)}
                      disabled={busy === policy.id}
                    >
                      Read and acknowledge
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </AsyncSection>
      <p className={s.note} style={{ marginTop: 12 }}>
        <Small>
          The policy text itself is not in this pass — there is no document body to show yet, only the
          acknowledgement record.
        </Small>
      </p>
    </Card>
  );
}
