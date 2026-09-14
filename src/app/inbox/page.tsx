'use client';

import { useCallback, useState } from 'react';
import { AsyncSection, ButtonLink, Card, EmptyState, PageHeader, Small, StatusPill } from '@/components/ui';
import { ApprovalList, type RequestDecision } from '@/components/requests/ApprovalList';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import {
  acknowledgeRequest,
  commentOnRequest,
  decideRequest,
  getApprovalQueue,
} from '@/data/requests';
import { getPendingSignatures } from '@/data/signing';
import { getOpenSurveysFor } from '@/data/surveys';
import { useAsync } from '@/hooks/useAsync';
import { formatDate } from '@/lib/date';
import { documentTypeLabels, requestTypeLabels, signingStateLabels, signingStateTones } from '@/lib/labels';
import type { RequestType } from '@/lib/types';
import s from './inbox.module.css';

const CHIPS: Array<{ value: RequestType | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'leave', label: requestTypeLabels.leave },
  { value: 'regularisation', label: requestTypeLabels.regularisation },
  { value: 'wfh', label: requestTypeLabels.wfh },
  { value: 'overtime', label: requestTypeLabels.overtime },
  { value: 'on-duty', label: requestTypeLabels['on-duty'] },
  { value: 'partial-day', label: requestTypeLabels['partial-day'] },
  { value: 'asset', label: requestTypeLabels.asset },
  { value: 'profile-change', label: requestTypeLabels['profile-change'] },
  { value: 'hr-notice', label: requestTypeLabels['hr-notice'] },
];

/** What this person still has to sign, alongside everything else waiting. */
function ToSign() {
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(() => getPendingSignatures(user), [user.employee.id]);

  return (
    <AsyncSection state={state} reload={reload} isEmpty={(rows) => rows.length === 0} empty={null} loadingRows={1}>
      {(rows) => (
        <Card title="Waiting for your signature" flush>
          <ul className={s.extras}>
            {rows.map((doc) => (
              <li key={doc.id} className={s.extraRow}>
                <span className={s.extraMain}>
                  <span className={s.extraTitle}>{doc.fileName}</span>
                  <span className={s.extraMeta}>
                    {documentTypeLabels[doc.type]}
                    {doc.signing?.expiresOn ? ` · expires ${formatDate(doc.signing.expiresOn)}` : ''}
                  </span>
                </span>
                <span className={s.extraActions}>
                  <StatusPill
                    label={signingStateLabels[doc.signing?.state ?? 'not-sent']}
                    tone={signingStateTones[doc.signing?.state ?? 'not-sent']}
                  />
                  <ButtonLink href="/me?tab=documents">Open</ButtonLink>
                </span>
              </li>
            ))}
          </ul>
          <p className={s.extraNote}>
            <Small>
              Nothing here is treated as accepted until it is signed. Leaving it is not agreement.
            </Small>
          </p>
        </Card>
      )}
    </AsyncSection>
  );
}

/** Surveys open to this person that they have not answered. */
function OpenSurveys() {
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(() => getOpenSurveysFor(user), [user.employee.id]);

  return (
    <AsyncSection state={state} reload={reload} isEmpty={(rows) => rows.length === 0} empty={null} loadingRows={1}>
      {(rows) => (
        <Card title="Surveys open to you" flush>
          <ul className={s.extras}>
            {rows.map((survey) => (
              <li key={survey.id} className={s.extraRow}>
                <span className={s.extraMain}>
                  <span className={s.extraTitle}>{survey.title}</span>
                  <span className={s.extraMeta}>
                    Closes {formatDate(survey.closesOn)} · {survey.anonymous ? 'anonymous' : 'named'}
                  </span>
                </span>
                <span className={s.extraActions}>
                  <ButtonLink href={`/surveys/${survey.id}`}>Answer</ButtonLink>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </AsyncSection>
  );
}

export default function InboxPage() {
  const { user } = useCurrentUser();
  const [type, setType] = useState<RequestType | 'all'>('all');
  const [showDone, setShowDone] = useState(false);

  const { state, reload } = useAsync(
    () =>
      getApprovalQueue(user, {
        type: type === 'all' ? '' : type,
        status: showDone ? '' : 'pending',
      }),
    [user.employee.id, type, showDone],
  );

  const act = useCallback(
    async (requestId: string, decision: RequestDecision, comment: string) => {
      if (decision === 'acknowledged') await acknowledgeRequest(user, requestId);
      else if (decision === 'commented') await commentOnRequest(user, requestId, comment);
      else await decideRequest(user, requestId, decision, comment);
    },
    [user],
  );

  return (
    <>
      <PageHeader
        title="Inbox"
        description="Everything waiting on you — approvals to decide and notices from HR, in one list."
      />

      <div className={s.filters}>
        <div className={s.chips} role="group" aria-label="Filter by type">
          {CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              className={`${s.chip} ${type === chip.value ? s.chipActive : ''}`}
              aria-pressed={type === chip.value}
              onClick={() => setType(chip.value)}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <label className={s.toggle}>
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
          Include things already dealt with
        </label>
      </div>

      <ToSign />
      <OpenSurveys />

      <Card flush>
        <AsyncSection
          state={state}
          reload={reload}
          isEmpty={(rows) => rows.length === 0}
          empty={
            <EmptyState
              title="Nothing is waiting on you"
              body={
                showDone
                  ? 'Nothing matches this filter. Try another type.'
                  : 'Leave, work-from-home, regularisation and asset requests from your team land here, along with notices from HR.'
              }
            />
          }
        >
          {(rows) => <ApprovalList requests={rows} onAct={act} />}
        </AsyncSection>
      </Card>
    </>
  );
}
