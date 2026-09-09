'use client';

import { useState } from 'react';
import {
  AsyncSection,
  Button,
  Card,
  DataTable,
  EmptyState,
  Stack,
  StatusPill,
  type Column,
} from '@/components/ui';
import { ApprovalList } from '@/components/requests/ApprovalList';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { getMyRequests } from '@/data/requests';
import { getAssets, requestAsset } from '@/data/workplace';
import { useAsync } from '@/hooks/useAsync';
import { formatDate } from '@/lib/date';
import { assetCategoryLabels, assetStatusLabels, assetStatusTones } from '@/lib/labels';
import type { Asset } from '@/lib/types';
import s from './assets.module.css';

export function AssetsPanel({ employeeId }: { employeeId: string }) {
  return (
    <Stack>
      <AssignedAssets employeeId={employeeId} />
      <AssetRequests employeeId={employeeId} />
    </Stack>
  );
}

function AssignedAssets({ employeeId }: { employeeId: string }) {
  const { state, reload } = useAsync(() => getAssets(employeeId), [employeeId]);

  const columns: Column<Asset>[] = [
    { key: 'name', header: 'Asset', primary: true, render: (a) => a.name },
    { key: 'category', header: 'Category', render: (a) => assetCategoryLabels[a.category] ?? a.category },
    { key: 'serial', header: 'Serial', render: (a) => a.serial },
    { key: 'assigned', header: 'Assigned on', render: (a) => formatDate(a.assignedOn) },
    {
      key: 'status',
      header: 'Status',
      render: (a) => (
        <StatusPill label={assetStatusLabels[a.status] ?? a.status} tone={assetStatusTones[a.status] ?? 'quiet'} />
      ),
    },
  ];

  return (
    <Card title="Assigned assets" hint="What the company has issued to you" flush>
      <AsyncSection
        state={state}
        reload={reload}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            title="Nothing is issued to you"
            body="Laptops, phones, access cards, tools and vehicles issued to you will be listed here."
          />
        }
      >
        {(rows) => <DataTable rows={rows} columns={columns} rowKey={(a) => a.id} caption="Assigned assets" />}
      </AsyncSection>
    </Card>
  );
}

function AssetRequests({ employeeId }: { employeeId: string }) {
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(() => getMyRequests(employeeId), [employeeId]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) return;
    if (!reason.trim()) {
      setError('Say why you need it — whoever approves this has to judge it.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await requestAsset(employeeId, name.trim(), reason.trim());
      setName('');
      setReason('');
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const isSelf = employeeId === user.employee.id;

  return (
    <Card
      title="Asset requests"
      hint="Ask for something new, or a replacement"
      flush
      actions={
        isSelf ? <Button onClick={() => setOpen((v) => !v)}>{open ? 'Cancel' : 'Request an asset'}</Button> : null
      }
    >
      {open ? (
        <div className={s.form}>
          <div className={s.field}>
            <label className={s.label} htmlFor="asset-name">
              What do you need
            </label>
            <input
              id="asset-name"
              type="text"
              value={name}
              placeholder="e.g. Second monitor, replacement access card"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="asset-reason">
              Why
            </label>
            <textarea id="asset-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {error ? <p className={s.error}>{error}</p> : null}
          <Button variant="primary" onClick={submit} disabled={busy || !name.trim()}>
            {busy ? 'Sending…' : 'Send to HR'}
          </Button>
        </div>
      ) : null}

      <AsyncSection
        state={state}
        reload={reload}
        isEmpty={(rows) => rows.filter((r) => r.type === 'asset').length === 0}
        empty={
          <EmptyState
            title="You have not asked for anything"
            body="Requests for a new or replacement asset, and what happened to them, appear here."
          />
        }
      >
        {(rows) => <ApprovalList requests={rows.filter((r) => r.type === 'asset')} showActions={false} />}
      </AsyncSection>
    </Card>
  );
}
