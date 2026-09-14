'use client';

import { useState } from 'react';
import {
  AsyncSection,
  Button,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  Small,
  Stack,
  StatusPill,
  type Column,
} from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { selectableFieldsFor } from '@/data/customFields';
import { downloadCsv, toCsv } from '@/data/reports';
import { BASE_COLUMNS, listSavedReports, runReport, saveReport, type ReportRow } from '@/data/savedReports';
import { useAsync } from '@/hooks/useAsync';
import { canSeeApprovals } from '@/lib/permissions';
import type { CustomFieldRecordType, ReportRecordType, Role, SavedReport } from '@/lib/types';
import s from './build.module.css';

const RECORD_TYPES: ReportRecordType[] = ['employee', 'attendance', 'leave', 'request', 'asset'];
const ROLES: Role[] = ['employee', 'manager', 'hr-admin'];

export default function ReportBuilderPage() {
  const { user } = useCurrentUser();
  const [recordType, setRecordType] = useState<ReportRecordType>('employee');
  const [columns, setColumns] = useState<string[]>(['fullName', 'department']);
  const [groupBy, setGroupBy] = useState('');
  const [filterColumn, setFilterColumn] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [name, setName] = useState('');
  const [sharedWith, setSharedWith] = useState<Role[]>(['hr-admin']);
  const [running, setRunning] = useState<SavedReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allowed = canSeeApprovals(user);
  const saved = useAsync(() => listSavedReports(user), [user.employee.id]);
  const customQuery = useAsync(
    () =>
      selectableFieldsFor(
        user,
        (recordType === 'attendance' || recordType === 'leave' ? 'employee' : recordType) as CustomFieldRecordType,
      ),
    [user.employee.id, recordType],
  );

  const baseColumns = BASE_COLUMNS[recordType];
  const customColumns =
    customQuery.state.status === 'ready'
      ? customQuery.state.data.map((f) => ({ key: `custom:${f.key}`, label: `${f.label} (custom)` }))
      : [];
  const allColumns = [...baseColumns, ...customColumns];

  const toggleColumn = (key: string) =>
    setColumns((c) => (c.includes(key) ? c.filter((x) => x !== key) : [...c, key]));

  const draft: SavedReport = {
    id: 'draft',
    name: name || 'Unsaved report',
    recordType,
    columns,
    filters: filterColumn && filterValue ? [{ column: filterColumn, operator: 'contains', value: filterValue }] : [],
    groupBy: groupBy || null,
    createdBy: user.employee.id,
    sharedWith,
    createdOn: new Date().toISOString(),
  };

  const save = async () => {
    setError(null);
    try {
      await saveReport(user, {
        name,
        recordType,
        columns,
        filters: draft.filters,
        groupBy: draft.groupBy,
        sharedWith,
      });
      setName('');
      saved.reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        title="Build a report"
        description="Pick a record type, choose columns, filter, group, and save it. Saved reports are questions, not answers — they run against whatever the person running them is allowed to see."
      />

      {!allowed ? (
        <Card>
          <EmptyState
            title="Report building is for managers and HR"
            body="Your own records, with the working shown, are under Me."
          />
        </Card>
      ) : (
        <Stack>
          <Card title="1 · What are you reporting on">
            <div className={s.row}>
              <div className={s.field}>
                <label className={s.label} htmlFor="rb-type">
                  Record type
                </label>
                <select
                  id="rb-type"
                  value={recordType}
                  onChange={(e) => {
                    setRecordType(e.target.value as ReportRecordType);
                    setColumns(['fullName']);
                    setGroupBy('');
                    setFilterColumn('');
                  }}
                >
                  {RECORD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t[0].toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          <Card title="2 · Columns" hint="Custom fields appear here automatically">
            <div className={s.columns}>
              {allColumns.map((c) => (
                <label key={c.key} className={s.checkbox}>
                  <input type="checkbox" checked={columns.includes(c.key)} onChange={() => toggleColumn(c.key)} />
                  {c.label}
                </label>
              ))}
            </div>
            <p className={s.note}>
              <Small>
                Fields marked HR-only are not offered here unless you are HR — and even then, a row you
                are not allowed to see comes back blank rather than filled from someone else&rsquo;s
                rights.
              </Small>
            </p>
          </Card>

          <Card title="3 · Filter and group">
            <div className={s.row}>
              <div className={s.field}>
                <label className={s.label} htmlFor="rb-filter-col">
                  Filter column
                </label>
                <select id="rb-filter-col" value={filterColumn} onChange={(e) => setFilterColumn(e.target.value)}>
                  <option value="">No filter</option>
                  {allColumns.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={s.field}>
                <label className={s.label} htmlFor="rb-filter-val">
                  Contains
                </label>
                <input
                  id="rb-filter-val"
                  type="text"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  disabled={!filterColumn}
                />
              </div>
              <div className={s.field}>
                <label className={s.label} htmlFor="rb-group">
                  Group by
                </label>
                <select id="rb-group" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                  <option value="">No grouping</option>
                  {allColumns.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          <Card title="4 · Run it">
            <Button variant="primary" onClick={() => setRunning(draft)} disabled={columns.length === 0}>
              Run
            </Button>
          </Card>

          {running ? <RunResult report={running} /> : null}

          <Card title="5 · Save it">
            <div className={s.row}>
              <div className={s.field}>
                <label className={s.label} htmlFor="rb-name">
                  Name
                </label>
                <input id="rb-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className={s.field}>
                <span className={s.label}>Share with</span>
                <div className={s.shareRow}>
                  {ROLES.map((r) => (
                    <label key={r} className={s.checkbox}>
                      <input
                        type="checkbox"
                        checked={sharedWith.includes(r)}
                        onChange={() =>
                          setSharedWith((v) => (v.includes(r) ? v.filter((x) => x !== r) : [...v, r]))
                        }
                      />
                      {r}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {error ? <p className={s.error}>{error}</p> : null}
            <Button onClick={save} disabled={!name.trim() || columns.length === 0}>
              Save report
            </Button>
            <p className={s.note}>
              <Small>
                Sharing a report shares the <em>question</em>. Whoever runs it sees only their own
                people, whatever you can see.
              </Small>
            </p>
          </Card>

          <Card title="Saved reports" flush>
            <AsyncSection
              state={saved.state}
              reload={saved.reload}
              isEmpty={(rows) => rows.length === 0}
              empty={<EmptyState title="No saved reports" body="Build one above and save it to re-run later." />}
            >
              {(rows) => (
                <ul className={s.savedList}>
                  {rows.map((r) => (
                    <li key={r.id} className={s.savedRow}>
                      <span className={s.savedMain}>
                        <span className={s.savedName}>{r.name}</span>
                        <span className={s.savedMeta}>
                          {r.recordType} · {r.columns.length} columns
                          {r.groupBy ? ` · grouped by ${r.groupBy}` : ''} · shared with{' '}
                          {r.sharedWith.join(', ')}
                        </span>
                      </span>
                      <Button onClick={() => setRunning(r)}>Run</Button>
                    </li>
                  ))}
                </ul>
              )}
            </AsyncSection>
          </Card>
        </Stack>
      )}
    </>
  );
}

function RunResult({ report }: { report: SavedReport }) {
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(() => runReport(user, report), [user.employee.id, report.id, JSON.stringify(report)]);

  return (
    <Card title={`Result — ${report.name}`} flush>
      <AsyncSection state={state} reload={reload} loadingRows={4}>
        {(run) => {
          const columns: Column<ReportRow>[] = run.columns.map((c, i) => ({
            key: c.key,
            header: c.label,
            primary: i === 0,
            render: (row) => row[c.key] || '—',
          }));

          return (
            <>
              <div className={s.scope}>
                <StatusPill label={`${run.rows.length} rows`} tone="neutral" />
                <span className={s.scopeNote}>{run.scopeNote}</span>
              </div>

              {run.hiddenColumns.length > 0 ? (
                <p className={s.hidden}>
                  {run.hiddenColumns.join(', ')} {run.hiddenColumns.length === 1 ? 'is' : 'are'} not
                  visible to you, so {run.hiddenColumns.length === 1 ? 'that column is' : 'those columns are'}{' '}
                  blank. {run.hiddenColumns.length === 1 ? 'It is' : 'They are'} not filled in from the
                  rights of whoever built this report.
                </p>
              ) : null}

              {run.rows.length === 0 ? (
                <EmptyState title="No rows" body="Nothing matches, within what you are allowed to see." />
              ) : run.groups ? (
                run.groups.map((g) => (
                  <div key={g.label} className={s.group}>
                    <h3 className={s.groupTitle}>
                      {g.label} · {g.rows.length}
                    </h3>
                    <DataTable rows={g.rows} columns={columns} rowKey={(r) => JSON.stringify(r)} caption={g.label} />
                  </div>
                ))
              ) : (
                <DataTable rows={run.rows} columns={columns} rowKey={(r) => JSON.stringify(r)} caption={report.name} />
              )}

              <div className={s.exportRow}>
                <Button
                  variant="quiet"
                  onClick={() =>
                    downloadCsv(
                      `${report.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`,
                      toCsv(
                        report.name,
                        run.rows.map((row) =>
                          Object.fromEntries(run.columns.map((c) => [c.label, row[c.key] ?? ''])),
                        ),
                      ),
                    )
                  }
                >
                  Export as CSV
                </Button>
                <Small>
                  <span className={s.scopeNote}>
                    The export contains exactly what is on screen — the same scope, the same blanks.
                  </span>
                </Small>
              </div>
            </>
          );
        }}
      </AsyncSection>
    </Card>
  );
}
