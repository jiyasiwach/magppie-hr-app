import type { CurrentUser } from '@/lib/auth';
import type { DocumentType, EmployeeDocument, Policy, PolicyAcknowledgement } from '@/lib/types';
import { canViewDocument } from '@/lib/permissions';
import { read, store, write } from './store';

export interface DocumentGroup {
  type: DocumentType;
  documents: EmployeeDocument[];
}

/** Company-wide documents — employeeId is null and everyone can read them. */
export async function getOrgDocuments(): Promise<DocumentGroup[]> {
  return read(() => {
    const visible = store.documents.filter((d) => d.employeeId === null && !d.archived);
    const order: DocumentType[] = ['policy', 'other', 'identity', 'education', 'employment', 'payroll', 'medical'];
    return order
      .map((type) => ({ type, documents: visible.filter((d) => d.type === type) }))
      .filter((group) => group.documents.length > 0);
  });
}

export async function getDocuments(
  user: CurrentUser,
  employeeId: string,
  includeArchived = false,
): Promise<DocumentGroup[]> {
  return read(() => {
    const visible = store.documents
      .filter((d) => d.employeeId === employeeId)
      .filter((d) => (includeArchived ? true : !d.archived))
      .filter((d) => canViewDocument(user, d));

    const order: DocumentType[] = ['identity', 'education', 'employment', 'payroll', 'medical', 'policy', 'other'];
    return order
      .map((type) => ({ type, documents: visible.filter((d) => d.type === type) }))
      .filter((group) => group.documents.length > 0);
  });
}

/** Nothing is deleted. Archiving keeps the record and its history. */
export async function archiveDocument(documentId: string): Promise<void> {
  await write(() => {
    const doc = store.documents.find((d) => d.id === documentId);
    if (doc) doc.archived = true;
  });
}

/** Archiving the wrong document should not be a one-way door. */
export async function restoreDocument(documentId: string): Promise<void> {
  await write(() => {
    const doc = store.documents.find((d) => d.id === documentId);
    if (doc) doc.archived = false;
  });
}

export async function uploadDocument(input: {
  employeeId: string;
  type: DocumentType;
  fileName: string;
  uploadedBy: string;
  visibility: EmployeeDocument['visibility'];
}): Promise<void> {
  await write(() => {
    store.documents.push({
      id: `doc-${input.employeeId}-${Date.now()}`,
      employeeId: input.employeeId,
      type: input.type,
      fileName: input.fileName,
      uploadedBy: input.uploadedBy,
      uploadedOn: new Date().toISOString(),
      visibility: input.visibility,
      archived: false,
    });
  });
}

export interface PolicyRow {
  policy: Policy;
  acknowledgement: PolicyAcknowledgement | null;
}

export async function getPolicies(employeeId: string): Promise<PolicyRow[]> {
  return read(() =>
    store.policies
      .map((policy) => ({
        policy,
        acknowledgement:
          store.policyAcknowledgements.find((a) => a.policyId === policy.id && a.employeeId === employeeId) ?? null,
      }))
      .sort((a, b) => Number(Boolean(a.acknowledgement)) - Number(Boolean(b.acknowledgement))),
  );
}

/** Drives the badge on the Policies navigation item. */
export async function getUnacknowledgedPolicyCount(employeeId: string): Promise<number> {
  return read(() => {
    const acknowledged = new Set(
      store.policyAcknowledgements.filter((a) => a.employeeId === employeeId).map((a) => a.policyId),
    );
    return store.policies.filter((p) => !acknowledged.has(p.id)).length;
  });
}

export async function acknowledgePolicy(policyId: string, employeeId: string): Promise<void> {
  await write(() => {
    const already = store.policyAcknowledgements.some((a) => a.policyId === policyId && a.employeeId === employeeId);
    if (already) return;
    store.policyAcknowledgements.push({
      id: `pa-${policyId}-${employeeId}`,
      policyId,
      employeeId,
      acknowledgedOn: new Date().toISOString(),
    });
  });
}
