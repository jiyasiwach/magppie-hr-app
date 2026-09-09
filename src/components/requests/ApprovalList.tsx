'use client';

import { useState } from 'react';
import type { Request } from '@/lib/types';
import { formatTimestamp } from '@/lib/date';
import { requestStatusLabels, requestStatusTones, requestTypeLabels } from '@/lib/labels';
import { canActOnRequest } from '@/lib/permissions';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { findEmployeeSync } from '@/data/directory';
import { Button, Person, StatusPill } from '@/components/ui';
import { rendererFor } from './renderers';
import s from './requests.module.css';

export type RequestAction = (requestId: string, decision: 'approved' | 'rejected' | 'commented', comment: string) => Promise<void>;

/**
 * One list that holds every kind of pending request. It knows only that a
 * request has a type, a requester, a summary and a payload — every later module
 * reuses this without changing it.
 */
export function ApprovalList({
  requests,
  onAct,
  showActions = true,
}: {
  requests: Request[];
  onAct?: RequestAction;
  showActions?: boolean;
}) {
  return (
    <ul className={s.list}>
      {requests.map((request) => (
        <RequestCard key={request.id} request={request} onAct={onAct} showActions={showActions} />
      ))}
    </ul>
  );
}

export function RequestCard({
  request,
  onAct,
  showActions = true,
}: {
  request: Request;
  onAct?: RequestAction;
  showActions?: boolean;
}) {
  const { user } = useCurrentUser();
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renderer = rendererFor(request.type);
  const requester = findEmployeeSync(request.raisedBy);
  const approver = findEmployeeSync(request.currentApprover);
  const canAct = showActions && Boolean(onAct) && canActOnRequest(user, request);

  const act = async (decision: 'approved' | 'rejected' | 'commented') => {
    if (!onAct) return;
    if (decision === 'rejected' && comment.trim().length === 0) {
      setError('A rejection needs a comment — the person has to know why.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onAct(request.id, decision, comment.trim());
      setComment('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={s.item}>
      <div className={s.top}>
        <div className={s.who}>
          <Person
            name={requester?.fullName ?? request.raisedBy}
            href={requester ? `/directory/${requester.id}` : undefined}
            secondary={
              <>
                {requester ? `${requester.designation}, ${requester.department} · ` : ''}
                raised {formatTimestamp(request.raisedOn)}
              </>
            }
          />
        </div>
        <div className={s.pills}>
          <StatusPill label={requestTypeLabels[request.type]} tone="neutral" />
          <StatusPill label={requestStatusLabels[request.status]} tone={requestStatusTones[request.status]} />
        </div>
      </div>

      <p className={s.summary}>{renderer.summary(request)}</p>

      <div className={s.details}>{renderer.details(request)}</div>

      {request.status === 'pending' && approver ? (
        <span className={s.meta}>Waiting on {approver.fullName}</span>
      ) : null}

      {request.decisionComments.length > 0 ? (
        <div className={s.decisions}>
          {request.decisionComments.map((c, i) => {
            const by = findEmployeeSync(c.by);
            return (
              <div key={i}>
                <strong>{by?.fullName ?? c.by}</strong> {c.decision === 'commented' ? 'commented' : c.decision}{' '}
                <span className={s.meta}>{formatTimestamp(c.on)}</span>
                {c.comment ? <div>{c.comment}</div> : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {error ? <p className={s.error}>{error}</p> : null}

      {canAct ? (
        <div className={s.actions}>
          <label className={s.comment}>
            <span className="visually-hidden">Comment on this request</span>
            <input
              type="text"
              value={comment}
              placeholder="Comment (required to reject)"
              onChange={(e) => setComment(e.target.value)}
            />
          </label>
          <Button variant="primary" onClick={() => act('approved')} disabled={busy}>
            Approve
          </Button>
          <Button onClick={() => act('rejected')} disabled={busy}>
            Reject
          </Button>
          <Button variant="quiet" onClick={() => act('commented')} disabled={busy || comment.trim().length === 0}>
            Comment only
          </Button>
        </div>
      ) : null}

      {showActions && !canAct && request.status === 'pending' ? (
        <span className={s.meta}>You cannot act on this request — it is not waiting on you.</span>
      ) : null}
    </li>
  );
}
