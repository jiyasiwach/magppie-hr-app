'use client';

import { useState } from 'react';
import { AsyncSection, Button, Card, EmptyState, Small, StatusPill } from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { getFieldsFor, setFieldValue } from '@/data/customFields';
import { useAsync } from '@/hooks/useAsync';
import type { CustomFieldRecordType } from '@/lib/types';
import s from './fields.module.css';

/**
 * Custom fields on a record. Which fields appear, and whether their values are
 * readable at all, is decided by `getFieldsFor` — this component never filters.
 */
export function CustomFieldsSection({
  recordType,
  recordId,
  recordOwnerId,
  title = 'Additional details',
}: {
  recordType: CustomFieldRecordType;
  recordId: string;
  recordOwnerId?: string;
  title?: string;
}) {
  const { user } = useCurrentUser();
  const owner = recordOwnerId ?? recordId;
  const { state, reload } = useAsync(
    () => getFieldsFor(user, recordType, recordId, owner),
    [user.employee.id, recordType, recordId, owner],
  );
  const [editing, setEditing] = useState(false);

  return (
    <Card
      title={title}
      hint="Fields HR added without a developer"
      actions={
        <Button variant="quiet" onClick={() => setEditing((v) => !v)}>
          {editing ? 'Done' : 'Edit'}
        </Button>
      }
    >
      <AsyncSection
        state={state}
        reload={reload}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            title="Nothing extra recorded"
            body="Fields HR adds for this kind of record appear here automatically, and on exports and reports."
          />
        }
        loadingRows={3}
      >
        {(rows) => (
          <dl className={s.grid}>
            {rows.map(({ field, value, editable }) => (
              <div key={field.id} className={s.item}>
                <dt className={s.label}>
                  {field.label}
                  {!field.active ? <StatusPill label="Retired" tone="quiet" /> : null}
                  {field.visibleTo === 'hr-only' ? <StatusPill label="HR only" tone="warning" /> : null}
                  {field.visibleTo === 'manager' ? <StatusPill label="Manager and HR" tone="info" /> : null}
                </dt>
                <dd className={s.value}>
                  {editing && editable && field.active ? (
                    <FieldInput
                      fieldId={field.id}
                      type={field.fieldType}
                      options={field.options}
                      value={value ?? ''}
                      recordId={recordId}
                      ownerId={owner}
                    />
                  ) : (
                    (value ?? <span className={s.empty}>Not recorded</span>)
                  )}
                  {field.helpText ? (
                    <span className={s.help}>
                      <Small>{field.helpText}</Small>
                    </span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </AsyncSection>
    </Card>
  );
}

function FieldInput({
  fieldId,
  type,
  options,
  value,
  recordId,
  ownerId,
}: {
  fieldId: string;
  type: string;
  options: string[];
  value: string;
  recordId: string;
  ownerId: string;
}) {
  const { user } = useCurrentUser();
  const [local, setLocal] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async (next: string) => {
    setLocal(next);
    setError(null);
    try {
      await setFieldValue(user, fieldId, recordId, next, ownerId);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <span className={s.inputWrap}>
      {type === 'dropdown' ? (
        <select value={local} onChange={(e) => save(e.target.value)}>
          <option value="">—</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : type === 'yesno' ? (
        <select value={local} onChange={(e) => save(e.target.value)}>
          <option value="">—</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      ) : type === 'file' ? (
        <input
          type="text"
          value={local}
          placeholder="File name — no file storage in this pass"
          onChange={(e) => setLocal(e.target.value)}
          onBlur={(e) => save(e.target.value)}
        />
      ) : (
        <input
          type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={(e) => save(e.target.value)}
        />
      )}
      {error ? <span className={s.error}>{error}</span> : null}
      {saved && !error ? (
        <span className={s.saved}>
          <Small>Saved</Small>
        </span>
      ) : null}
    </span>
  );
}
