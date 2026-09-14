'use client';

import { useState } from 'react';
import {
  AsyncSection,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Small,
  Stack,
  StatusPill,
} from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import {
  createField,
  listFields,
  moveField,
  restoreField,
  retireField,
  setFieldOptions,
  setFieldVisibility,
} from '@/data/customFields';
import { useAsync } from '@/hooks/useAsync';
import { fieldAudienceLabels, fieldEditorLabels, fieldTypeLabels } from '@/lib/labels';
import { canSeeSettings } from '@/lib/permissions';
import type { CustomField, CustomFieldRecordType, CustomFieldType, FieldAudience } from '@/lib/types';
import s from './fields.module.css';

const RECORD_TYPES: CustomFieldRecordType[] = ['employee', 'request', 'asset', 'document'];
const TYPES: CustomFieldType[] = ['text', 'number', 'date', 'dropdown', 'yesno', 'file'];
const AUDIENCES: FieldAudience[] = ['hr-only', 'manager', 'employee'];

export default function CustomFieldsSettingsPage() {
  const { user } = useCurrentUser();
  const [recordType, setRecordType] = useState<CustomFieldRecordType>('employee');
  const allowed = canSeeSettings(user);
  const { state, reload } = useAsync(() => listFields(recordType, true), [recordType]);

  return (
    <>
      <PageHeader
        title="Custom fields"
        description="Add a field nobody thought of, without a developer. Fields appear on the relevant form, on the profile, and in exports and reports."
      />

      <Stack>
        <Card>
          <label className={s.label} htmlFor="cf-record">
            Record type
          </label>
          <select
            id="cf-record"
            className={s.picker}
            value={recordType}
            onChange={(e) => setRecordType(e.target.value as CustomFieldRecordType)}
          >
            {RECORD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </Card>

        {allowed ? <NewField recordType={recordType} onDone={reload} /> : null}

        <Card title="Fields" flush>
          <AsyncSection
            state={state}
            reload={reload}
            allowed={allowed}
            deniedLabel="custom fields"
            isEmpty={(rows) => rows.length === 0}
            empty={
              <EmptyState
                title="No custom fields yet"
                body="Add one above and it appears wherever this record type is shown."
              />
            }
          >
            {(rows) => (
              <ul className={s.list}>
                {rows.map((field, i) => (
                  <FieldRow key={field.id} field={field} first={i === 0} last={i === rows.length - 1} />
                ))}
              </ul>
            )}
          </AsyncSection>
        </Card>

        <Card title="How visibility works">
          <ul className={s.rules}>
            <li>
              <strong>HR only</strong> — nobody else, anywhere. Not on the profile, not in an export,
              not in a report, and the HR assistant cannot read it either.
            </li>
            <li>
              <strong>Manager and HR</strong> — the person&rsquo;s management chain. <em>Flagged:</em>{' '}
              whether the person themselves should also see a field about them is a real question
              nobody has answered. Today they do not.
            </li>
            <li>
              <strong>The person, their manager and HR</strong> — the most open setting.
            </li>
            <li>
              New fields default to <strong>HR only</strong>, so opening one up is always a deliberate
              act.
            </li>
          </ul>
        </Card>
      </Stack>
    </>
  );
}

function FieldRow({ field, first, last }: { field: CustomField; first: boolean; last: boolean }) {
  const { user } = useCurrentUser();
  const [optionText, setOptionText] = useState(field.options.join(', '));
  const [editingOptions, setEditingOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <li className={`${s.row} ${field.active ? '' : s.retired}`}>
      <div className={s.rowMain}>
        <span className={s.rowTitle}>
          {field.label}
          {!field.active ? <StatusPill label="Retired" tone="quiet" /> : null}
          {field.required ? <StatusPill label="Required" tone="warning" /> : null}
        </span>
        <span className={s.rowMeta}>
          {fieldTypeLabels[field.fieldType]} · key <code>{field.key}</code> · visible to{' '}
          {fieldAudienceLabels[field.visibleTo]} · edited by {fieldEditorLabels[field.editableBy]}
        </span>
        {field.helpText ? (
          <span className={s.rowMeta}>
            <Small>{field.helpText}</Small>
          </span>
        ) : null}

        {field.fieldType === 'dropdown' ? (
          editingOptions ? (
            <div className={s.optionEditor}>
              <input
                type="text"
                value={optionText}
                aria-label={`Options for ${field.label}`}
                onChange={(e) => setOptionText(e.target.value)}
              />
              <Button
                onClick={() =>
                  act(async () => {
                    await setFieldOptions(
                      user,
                      field.id,
                      optionText.split(',').map((o) => o.trim()).filter(Boolean),
                    );
                    setEditingOptions(false);
                  })
                }
              >
                Save options
              </Button>
              <Button variant="quiet" onClick={() => setEditingOptions(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <span className={s.rowMeta}>
              Options: {field.options.join(', ') || 'none'} ·{' '}
              <button type="button" className={s.linkButton} onClick={() => setEditingOptions(true)}>
                edit
              </button>
            </span>
          )
        ) : null}

        {error ? <span className={s.error}>{error}</span> : null}
      </div>

      <div className={s.rowActions}>
        <select
          aria-label={`Who can see ${field.label}`}
          value={field.visibleTo}
          onChange={(e) => act(() => setFieldVisibility(user, field.id, e.target.value as FieldAudience, field.editableBy))}
        >
          {AUDIENCES.map((a) => (
            <option key={a} value={a}>
              {fieldAudienceLabels[a]}
            </option>
          ))}
        </select>
        <Button variant="quiet" onClick={() => act(() => moveField(user, field.id, -1))} disabled={first}>
          ↑
        </Button>
        <Button variant="quiet" onClick={() => act(() => moveField(user, field.id, 1))} disabled={last}>
          ↓
        </Button>
        {field.active ? (
          <Button variant="quiet" onClick={() => act(() => retireField(user, field.id))}>
            Retire
          </Button>
        ) : (
          <Button variant="quiet" onClick={() => act(() => restoreField(user, field.id))}>
            Restore
          </Button>
        )}
      </div>
    </li>
  );
}

function NewField({ recordType, onDone }: { recordType: CustomFieldRecordType; onDone: () => void }) {
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldType>('text');
  const [options, setOptions] = useState('');
  const [required, setRequired] = useState(false);
  const [visibleTo, setVisibleTo] = useState<FieldAudience>('hr-only');
  const [editableBy, setEditableBy] = useState<'hr-only' | 'employee'>('hr-only');
  const [helpText, setHelpText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await createField(user, {
        recordType,
        label,
        fieldType,
        options: options.split(',').map((o) => o.trim()).filter(Boolean),
        required,
        visibleTo,
        editableBy,
        helpText: helpText.trim() || null,
      });
      setLabel('');
      setOptions('');
      setHelpText('');
      setOpen(false);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Add a field"
      actions={<Button onClick={() => setOpen((v) => !v)}>{open ? 'Cancel' : 'Add a field'}</Button>}
    >
      {open ? (
        <div className={s.form}>
          <div className={s.formRow}>
            <div className={s.field}>
              <label className={s.label} htmlFor="nf-label">
                Label
              </label>
              <input id="nf-label" type="text" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="nf-type">
                Type
              </label>
              <select id="nf-type" value={fieldType} onChange={(e) => setFieldType(e.target.value as CustomFieldType)}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {fieldTypeLabels[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {fieldType === 'dropdown' ? (
            <div className={s.field}>
              <label className={s.label} htmlFor="nf-options">
                Options, separated by commas
              </label>
              <input id="nf-options" type="text" value={options} onChange={(e) => setOptions(e.target.value)} />
            </div>
          ) : null}

          <div className={s.formRow}>
            <div className={s.field}>
              <label className={s.label} htmlFor="nf-visible">
                Who can see it
              </label>
              <select id="nf-visible" value={visibleTo} onChange={(e) => setVisibleTo(e.target.value as FieldAudience)}>
                {AUDIENCES.map((a) => (
                  <option key={a} value={a}>
                    {fieldAudienceLabels[a]}
                  </option>
                ))}
              </select>
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="nf-editable">
                Who can change it
              </label>
              <select
                id="nf-editable"
                value={editableBy}
                onChange={(e) => setEditableBy(e.target.value as 'hr-only' | 'employee')}
              >
                {Object.entries(fieldEditorLabels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="nf-help">
              Help text (optional)
            </label>
            <input id="nf-help" type="text" value={helpText} onChange={(e) => setHelpText(e.target.value)} />
          </div>

          <label className={s.checkbox}>
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
            Required
          </label>

          <p className={s.note}>
            <Small>
              Defaults to HR only. Opening a field up to more people should be something you chose, not
              something that happened.
            </Small>
          </p>

          {error ? <p className={s.error}>{error}</p> : null}

          <div>
            <Button variant="primary" onClick={submit} disabled={busy || !label.trim()}>
              {busy ? 'Adding…' : 'Add field'}
            </Button>
          </div>
        </div>
      ) : (
        <p className={s.note}>
          <Small>
            A trade certification, a uniform size, a site pass number — anything HR needs that nobody
            thought of when this was built.
          </Small>
        </p>
      )}
    </Card>
  );
}
