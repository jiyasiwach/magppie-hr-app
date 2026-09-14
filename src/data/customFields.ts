import type { CurrentUser } from '@/lib/auth';
import type { CustomField, CustomFieldRecordType, CustomFieldValue, FieldAudience } from '@/lib/types';
import { isSelf, managesEmployee } from '@/lib/permissions';
import { read, store, write } from './store';

/**
 * ============================================================================
 * Custom fields — ONE visibility gate
 * ============================================================================
 * `canSeeField` below is the only place that decides whether a custom field is
 * readable. The profile, the export, the report builder and the HR assistant
 * all call it. That is deliberate: a field marked HR-only leaks the moment a
 * second code path decides for itself, and a report builder is exactly where
 * that happens.
 *
 * The audience is a ladder of increasing openness:
 *   hr-only  → HR only
 *   manager  → HR and the person's management chain
 *   employee → HR, the management chain, and the person themselves
 *
 * FLAGGED: whether a 'manager' field should also be visible to the person it is
 * about is a real question nobody has answered. Today it is not — a site pass
 * number is visible to the manager and HR but not to the holder, which may be
 * wrong.
 * ============================================================================
 */

export function canSeeField(user: CurrentUser, audience: FieldAudience, recordOwnerId: string): boolean {
  if (user.role === 'hr-admin') return true;
  const manages = managesEmployee(user, recordOwnerId);
  const self = isSelf(user, recordOwnerId);

  switch (audience) {
    case 'hr-only':
      return false;
    case 'manager':
      return manages;
    case 'employee':
      return self || manages;
    default:
      return false;
  }
}

export function canEditField(user: CurrentUser, field: CustomField, recordOwnerId: string): boolean {
  if (!canSeeField(user, field.visibleTo, recordOwnerId)) return false;
  if (field.editableBy === 'hr-only') return user.role === 'hr-admin';
  return isSelf(user, recordOwnerId) || user.role === 'hr-admin';
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export async function listFields(
  recordType: CustomFieldRecordType,
  includeRetired = false,
): Promise<CustomField[]> {
  return read(() =>
    store.customFields
      .filter((f) => f.recordType === recordType && (includeRetired || f.active))
      .sort((a, b) => a.displayOrder - b.displayOrder),
  );
}

export interface FieldWithValue {
  field: CustomField;
  value: string | null;
  editable: boolean;
}

/**
 * The single call every consumer uses. Retired fields are included only when
 * they still hold a value — retiring hides a field from new entry without
 * erasing what was already recorded.
 */
export async function getFieldsFor(
  user: CurrentUser,
  recordType: CustomFieldRecordType,
  recordId: string,
  recordOwnerId: string = recordId,
): Promise<FieldWithValue[]> {
  return read(() => {
    const values = new Map(
      store.customFieldValues.filter((v) => v.recordId === recordId).map((v) => [v.fieldId, v.value]),
    );

    return store.customFields
      .filter((f) => f.recordType === recordType)
      .filter((f) => f.active || values.has(f.id))
      .filter((f) => canSeeField(user, f.visibleTo, recordOwnerId))
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((field) => ({
        field,
        value: values.get(field.id) ?? null,
        editable: canEditField(user, field, recordOwnerId),
      }));
  });
}

/**
 * Column keys a person is allowed to pull into a report or an export, for a
 * whole record type. Used by the report builder so an HR-only field never
 * appears as a choosable column to someone who cannot see it.
 *
 * NOTE: this is a *type-level* check. Per-row visibility still applies when the
 * rows are built — see `valueForExport`.
 */
export async function selectableFieldsFor(
  user: CurrentUser,
  recordType: CustomFieldRecordType,
): Promise<CustomField[]> {
  return read(() =>
    store.customFields
      .filter((f) => f.recordType === recordType && f.active)
      .filter((f) => (f.visibleTo === 'hr-only' ? user.role === 'hr-admin' : true))
      .sort((a, b) => a.displayOrder - b.displayOrder),
  );
}

/**
 * Row-level value for an export or a report cell. Returns null when this
 * particular viewer may not see this particular person's value, which is the
 * check a report builder usually forgets.
 */
export function valueForExport(
  user: CurrentUser,
  fieldKey: string,
  recordId: string,
  recordOwnerId: string = recordId,
): string | null {
  const field = store.customFields.find((f) => f.key === fieldKey);
  if (!field) return null;
  if (!canSeeField(user, field.visibleTo, recordOwnerId)) return null;
  return store.customFieldValues.find((v) => v.fieldId === field.id && v.recordId === recordId)?.value ?? null;
}

// ---------------------------------------------------------------------------
// Writing values
// ---------------------------------------------------------------------------

export async function setFieldValue(
  user: CurrentUser,
  fieldId: string,
  recordId: string,
  value: string,
  recordOwnerId: string = recordId,
): Promise<void> {
  await write(() => {
    const field = store.customFields.find((f) => f.id === fieldId);
    if (!field) throw new Error('No such field.');
    if (!field.active) throw new Error('That field has been retired and can no longer be edited.');
    if (!canEditField(user, field, recordOwnerId)) throw new Error('You cannot change that field.');
    if (field.required && !value.trim()) throw new Error(`${field.label} is required.`);

    const existing = store.customFieldValues.find((v) => v.fieldId === fieldId && v.recordId === recordId);
    if (existing) existing.value = value;
    else
      store.customFieldValues.push({
        id: `cfv-${recordId}-${fieldId}-${Date.now()}`,
        fieldId,
        recordId,
        value,
      } as CustomFieldValue);
  });
}

// ---------------------------------------------------------------------------
// Administering the fields themselves — HR, without a developer
// ---------------------------------------------------------------------------

function assertHr(user: CurrentUser) {
  if (user.role !== 'hr-admin') throw new Error('Only HR can change the fields themselves.');
}

export interface NewFieldInput {
  recordType: CustomFieldRecordType;
  label: string;
  fieldType: CustomField['fieldType'];
  options: string[];
  required: boolean;
  visibleTo: FieldAudience;
  editableBy: CustomField['editableBy'];
  helpText: string | null;
}

export async function createField(user: CurrentUser, input: NewFieldInput): Promise<void> {
  await write(() => {
    assertHr(user);
    if (!input.label.trim()) throw new Error('Give the field a label.');
    if (input.fieldType === 'dropdown' && input.options.length === 0) {
      throw new Error('A dropdown needs at least one option.');
    }
    const key = input.label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    if (store.customFields.some((f) => f.key === key && f.recordType === input.recordType)) {
      throw new Error('A field with that name already exists on this record type.');
    }
    const order =
      Math.max(0, ...store.customFields.filter((f) => f.recordType === input.recordType).map((f) => f.displayOrder)) + 1;

    store.customFields.push({
      id: `cf-${key}-${Date.now()}`,
      recordType: input.recordType,
      label: input.label.trim(),
      key,
      fieldType: input.fieldType,
      options: input.options,
      required: input.required,
      visibleTo: input.visibleTo,
      editableBy: input.editableBy,
      displayOrder: order,
      active: true,
      helpText: input.helpText,
    });
  });
}

/** Retire, never delete. Old records keep their values. */
export async function retireField(user: CurrentUser, fieldId: string): Promise<void> {
  await write(() => {
    assertHr(user);
    const field = store.customFields.find((f) => f.id === fieldId);
    if (field) field.active = false;
  });
}

export async function restoreField(user: CurrentUser, fieldId: string): Promise<void> {
  await write(() => {
    assertHr(user);
    const field = store.customFields.find((f) => f.id === fieldId);
    if (field) field.active = true;
  });
}

export async function moveField(user: CurrentUser, fieldId: string, direction: -1 | 1): Promise<void> {
  await write(() => {
    assertHr(user);
    const field = store.customFields.find((f) => f.id === fieldId);
    if (!field) return;
    const siblings = store.customFields
      .filter((f) => f.recordType === field.recordType)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const index = siblings.findIndex((f) => f.id === fieldId);
    const swapWith = siblings[index + direction];
    if (!swapWith) return;
    const temp = field.displayOrder;
    field.displayOrder = swapWith.displayOrder;
    swapWith.displayOrder = temp;
  });
}

/** Dropdown options are editable without touching the field itself. */
export async function setFieldOptions(user: CurrentUser, fieldId: string, options: string[]): Promise<void> {
  await write(() => {
    assertHr(user);
    const field = store.customFields.find((f) => f.id === fieldId);
    if (!field) return;
    if (field.fieldType !== 'dropdown') throw new Error('Only a dropdown has options.');
    if (options.length === 0) throw new Error('A dropdown needs at least one option.');
    field.options = options;
  });
}

export async function setFieldVisibility(
  user: CurrentUser,
  fieldId: string,
  visibleTo: FieldAudience,
  editableBy: CustomField['editableBy'],
): Promise<void> {
  await write(() => {
    assertHr(user);
    const field = store.customFields.find((f) => f.id === fieldId);
    if (!field) return;
    field.visibleTo = visibleTo;
    field.editableBy = editableBy;
  });
}
