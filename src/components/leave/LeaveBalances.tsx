'use client';

import { AsyncSection, Card, EmptyState, Muted, Small, Working } from '@/components/ui';
import { getLeaveBalances } from '@/data/leave';
import { useAsync } from '@/hooks/useAsync';
import { formatDate } from '@/lib/date';
import s from './leave.module.css';

const directionLabels = { credit: 'Credit', debit: 'Debit', adjustment: 'Adjustment' } as const;

/**
 * Rule 6 in full: the balance is a number, and next to it is every credit,
 * debit and adjustment that produced it, with a running total.
 */
export function LeaveBalances({ employeeId }: { employeeId: string }) {
  const { state, reload } = useAsync(() => getLeaveBalances(employeeId), [employeeId]);

  return (
    <Card title="Leave balance" hint="Each balance opens up into the transactions that made it.">
      <AsyncSection
        state={state}
        reload={reload}
        isEmpty={(rows) => rows.length === 0}
        empty={<EmptyState title="No leave types configured" />}
        loadingRows={4}
      >
        {(balances) => (
          <div className={s.balances}>
            {balances.map((b) => (
              <div key={b.leaveType.id} className={s.balance}>
                <span className={s.balanceName}>{b.leaveType.name}</span>
                <span className={s.balanceValue}>{b.balance}</span>
                <span className={s.balanceMeta}>
                  days available
                  {b.pendingDays > 0 ? ` · ${b.pendingDays} awaiting approval` : ''}
                </span>
                <span className={s.balanceMeta}>
                  {b.leaveType.accrues ? 'Accrues monthly' : 'Does not accrue'} ·{' '}
                  {b.leaveType.halfDaysAllowed ? 'half days allowed' : 'full days only'}
                  {b.leaveType.canGoNegative ? ' · can go negative' : ''}
                </span>

                <Working summary="How was this balance worked out?">
                  {b.breakdown.length === 0 ? (
                    <Muted>
                      <Small>No transactions on this leave type yet, so the balance is zero.</Small>
                    </Muted>
                  ) : (
                    <table className={s.ledger}>
                      <caption className="visually-hidden">
                        Every transaction behind the {b.leaveType.name} balance
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Date</th>
                          <th scope="col">What</th>
                          <th scope="col" className={s.num}>
                            Change
                          </th>
                          <th scope="col" className={s.num}>
                            Balance
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {b.breakdown.map((t) => (
                          <tr key={t.id}>
                            <td>{formatDate(t.date)}</td>
                            <td>
                              {directionLabels[t.direction]} — {t.reason}
                            </td>
                            <td className={s.num}>
                              {t.direction === 'debit' ? '−' : '+'}
                              {t.amount}
                            </td>
                            <td className={s.num}>{t.runningBalance}</td>
                          </tr>
                        ))}
                        <tr className={s.ledgerTotal}>
                          <td colSpan={2}>
                            Credited {b.credited} · debited {b.debited} · adjusted {b.adjusted}
                          </td>
                          <td className={s.num} />
                          <td className={s.num}>{b.balance}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                  {b.pendingDays > 0 ? (
                    <p className={s.balanceMeta} style={{ marginTop: 8 }}>
                      {b.pendingDays} day(s) are in pending requests. Pending leave is not debited until
                      it is approved, so the balance above does not include it.
                    </p>
                  ) : null}
                </Working>
              </div>
            ))}
          </div>
        )}
      </AsyncSection>
    </Card>
  );
}
