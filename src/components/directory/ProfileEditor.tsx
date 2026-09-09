'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { editableByHr, updateEmployee, type EditableField } from '@/data/directory';
import { employmentTypeLabels, employeeStatusLabels } from '@/lib/labels';
import { canEditEmployeeFully, selfEditableFields } from '@/lib/permissions';
import type { Employee } from '@/lib/types';
import { departments, designations, employees, locations } from '@/mocks';
import s from './profileEditor.module.css';

type FieldKind = 'text' | 'email' | 'tel' | 'date' | 'select';

interface FieldSpec {
  field: EditableField;
  label: string;
  kind: FieldKind;
  options?: Array<{ value: string; label: string }>;
  group: 'personal' | 'job';
  hint?: string;
}

function specs(): FieldSpec[] {
  const people = [...employees]
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((e) => ({ value: e.id, label: `${e.fullName} — ${e.designation}` }));

  return [
    { field: 'fullName', label: 'Full name', kind: 'text', group: 'personal' },
    { field: 'workEmail', label: 'Work email', kind: 'email', group: 'personal' },
    { field: 'personalPhone', label: 'Personal phone', kind: 'tel', group: 'personal' },
    { field: 'employeeCode', label: 'Employee code', kind: 'text', group: 'job' },
    {
      field: 'department',
      label: 'Department',
      kind: 'select',
      options: departments.map((d) => ({ value: d, label: d })),
      group: 'job',
      hint: 'Opens a new employment record',
    },
    {
      field: 'designation',
      label: 'Designation',
      kind: 'select',
      options: designations.map((d) => ({ value: d, label: d })),
      group: 'job',
      hint: 'Opens a new employment record',
    },
    {
      field: 'managerId',
      label: 'Manager',
      kind: 'select',
      options: [{ value: '', label: 'No manager' }, ...people],
      group: 'job',
      hint: 'Opens a new employment record',
    },
    {
      field: 'location',
      label: 'Location',
      kind: 'select',
      options: locations.map((l) => ({ value: l, label: l })),
      group: 'job',
    },
    { field: 'joiningDate', label: 'Joining date', kind: 'date', group: 'job' },
    {
      field: 'employmentType',
      label: 'Employment type',
      kind: 'select',
      options: Object.entries(employmentTypeLabels).map(([value, label]) => ({ value, label })),
      group: 'job',
    },
    {
      field: 'status',
      label: 'Status',
      kind: 'select',
      options: Object.entries(employeeStatusLabels).map(([value, label]) => ({ value, label })),
      group: 'job',
      hint: 'Nobody is deleted — set someone to Inactive instead',
    },
    { field: 'probationEndDate', label: 'Probation ends', kind: 'date', group: 'job' },
  ];
}

export function ProfileEditor({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const { user } = useCurrentUser();
  const isHr = canEditEmployeeFully(user);

  const allowed: readonly string[] = isHr
    ? editableByHr
    : (selfEditableFields as readonly string[]).filter((f) =>
        (editableByHr as readonly string[]).includes(f),
      );

  const fields = specs().filter((spec) => allowed.includes(spec.field));

  const initial = Object.fromEntries(
    fields.map((f) => [f.field, (employee[f.field] ?? '') as string]),
  ) as Record<EditableField, string>;

  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<number | null>(null);

  const changed = fields.filter((f) => values[f.field] !== initial[f.field]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const changes = Object.fromEntries(changed.map((f) => [f.field, values[f.field]]));
      const outcome = await updateEmployee(user, employee.id, changes);
      if (outcome.applied) onClose();
      else setSent(outcome.requestIds.length);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const personal = fields.filter((f) => f.group === 'personal');
  const job = fields.filter((f) => f.group === 'job');

  return (
    <div className={s.editor}>
      {personal.length > 0 ? (
        <FieldGroup title="Personal details" fields={personal} values={values} setValues={setValues} />
      ) : null}
      {job.length > 0 ? (
        <FieldGroup title="Job details" fields={job} values={values} setValues={setValues} />
      ) : null}

      {isHr ? (
        <p className={s.note}>
          Changes take effect today. Back-dating a transfer is not supported — flagged, not decided.
        </p>
      ) : (
        <p className={s.note}>
          You can change your personal phone number. Anything else is changed by HR. Your change goes to
          HR for approval before it appears on your profile. A profile photo also belongs to you, but
          there is no file storage in this pass, so it cannot be uploaded yet.
        </p>
      )}

      {error ? <p className={s.error}>{error}</p> : null}
      {sent !== null ? (
        <p className={s.sent}>
          Sent for approval — {sent} change{sent === 1 ? '' : 's'} now in HR&rsquo;s queue. Your profile
          keeps the old value until it is approved.
        </p>
      ) : null}

      <div className={s.actions}>
        <Button variant="primary" onClick={save} disabled={busy || changed.length === 0}>
          {busy ? 'Saving…' : isHr ? 'Save changes' : 'Send for approval'}
        </Button>
        <Button variant="quiet" onClick={onClose}>
          {sent !== null ? 'Close' : 'Cancel'}
        </Button>
        <span className={s.count}>
          {changed.length === 0
            ? 'Nothing changed yet'
            : `${changed.length} field${changed.length === 1 ? '' : 's'} changed`}
        </span>
      </div>
    </div>
  );
}

function FieldGroup({
  title,
  fields,
  values,
  setValues,
}: {
  title: string;
  fields: FieldSpec[];
  values: Record<EditableField, string>;
  setValues: (fn: (v: Record<EditableField, string>) => Record<EditableField, string>) => void;
}) {
  return (
    <fieldset className={s.group}>
      <legend className={s.legend}>{title}</legend>
      <div className={s.grid}>
        {fields.map((spec) => {
          const id = `edit-${spec.field}`;
          const set = (value: string) => setValues((v) => ({ ...v, [spec.field]: value }));
          return (
            <div key={spec.field} className={s.field}>
              <label className={s.label} htmlFor={id}>
                {spec.label}
              </label>
              {spec.kind === 'select' ? (
                <select id={id} value={values[spec.field]} onChange={(e) => set(e.target.value)}>
                  {spec.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input id={id} type={spec.kind} value={values[spec.field]} onChange={(e) => set(e.target.value)} />
              )}
              {spec.hint ? <span className={s.hint}>{spec.hint}</span> : null}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
