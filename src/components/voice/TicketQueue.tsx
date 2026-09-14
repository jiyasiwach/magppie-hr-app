'use client';

import Link from 'next/link';
import { AsyncSection, Card, StatusPill } from '@/components/ui';
import type { AsyncState } from '@/hooks/useAsync';
import { AGEING_THRESHOLD_DAYS, ageInDays } from '@/data/voice';
import { findEmployeeSync } from '@/data/directory';
import { formatDate } from '@/lib/date';
import { voiceCategoryLabels, voiceStatusLabels, voiceStatusTones } from '@/lib/labels';
import type { VoiceTicket } from '@/lib/types';
import s from './voice.module.css';

export function TicketQueue({
  state,
  reload,
  allowed,
  deniedLabel,
  empty,
  showRaiser,
}: {
  state: AsyncState<VoiceTicket[]>;
  reload: () => void;
  allowed: boolean;
  deniedLabel: string;
  empty: React.ReactNode;
  showRaiser: boolean;
}) {
  return (
    <Card flush>
      <AsyncSection
        state={state}
        reload={reload}
        allowed={allowed}
        deniedLabel={deniedLabel}
        isEmpty={(rows) => rows.length === 0}
        empty={empty}
      >
        {(rows) => (
          <ul className={s.queue}>
            {rows.map((t) => {
              const age = ageInDays(t);
              const open = t.status !== 'resolved' && t.status !== 'closed-without-action';
              const raiser = findEmployeeSync(t.raiserId);
              return (
                <li key={t.id}>
                  <Link href={`/voice/${t.id}`} className={s.queueRow}>
                    <span className={s.queueMain}>
                      <span className={s.subject}>{t.subject}</span>
                      <span className={s.meta}>
                        {voiceCategoryLabels[t.category]}
                        {showRaiser
                          ? ` · ${t.anonymous ? 'Raised anonymously' : (raiser?.fullName ?? 'Unknown')}`
                          : ''}
                        {' · '}
                        {t.referenceCode} · raised {formatDate(t.createdOn.slice(0, 10))}
                      </span>
                      {t.assignedTo ? (
                        <span className={s.meta}>
                          With {findEmployeeSync(t.assignedTo)?.fullName ?? t.assignedTo}
                        </span>
                      ) : open ? (
                        <span className={s.meta}>Not assigned to anyone yet</span>
                      ) : null}
                    </span>
                    <span className={s.pills}>
                      {open && age > AGEING_THRESHOLD_DAYS ? (
                        <span className={s.ageing}>
                          {t.firstResponseOn ? `${age} days open` : `${age} days, no reply yet`}
                        </span>
                      ) : null}
                      <StatusPill label={voiceStatusLabels[t.status]} tone={voiceStatusTones[t.status]} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </AsyncSection>
    </Card>
  );
}
