import type { CurrentUser } from '@/lib/auth';
import type { EmployeeDocument } from '@/lib/types';
import { MOCK_TODAY } from '@/lib/clock';
import { canViewDocument } from '@/lib/permissions';
import { read, store, write } from './store';

/**
 * ============================================================================
 * Document signing
 * ============================================================================
 * The signing ENGINE is deliberately not built. What exists is the state
 * machine, the record, and a clearly marked integration point.
 *
 *   not-sent → awaiting-signature → signed
 *                                 → declined
 *                                 → expired
 *
 * Two rules that hold regardless of provider:
 *
 *  1. A SIGNED RECORD IS IMMUTABLE. `recordSignature` refuses to touch a
 *     document that is already signed. A signature that can be edited
 *     afterwards is not a signature.
 *  2. SILENCE IS NEVER ACCEPTANCE. Nothing anywhere treats an unsigned or
 *     expired document as agreed. `isAccepted` is the only place that answers
 *     that question, and it answers it narrowly.
 *
 * NO PROVIDER HAS BEEN CHOSEN. `signatureReference` is where the provider's
 * envelope id goes. Whoever picks one must confirm: whether it is legally an
 * electronic signature under the Indian IT Act, whether Aadhaar eSign is
 * wanted, where the audit trail lives, and how long they retain it.
 * ============================================================================
 */

export const SIGNING_PROVIDER: string | null = null;

export interface SignableDocument {
  document: EmployeeDocument;
  overdue: boolean;
}

export async function getSignablesFor(user: CurrentUser, employeeId: string): Promise<SignableDocument[]> {
  return read(() =>
    store.documents
      .filter((d) => d.employeeId === employeeId && d.signing && !d.archived)
      .filter((d) => canViewDocument(user, d))
      .map((document) => ({
        document,
        overdue: Boolean(
          document.signing?.state === 'awaiting-signature' &&
            document.signing.expiresOn &&
            document.signing.expiresOn < MOCK_TODAY,
        ),
      }))
      // Anything still needing a signature first.
      .sort((a) => (a.document.signing?.state === 'awaiting-signature' ? -1 : 1)),
  );
}

/** What this person still has to sign. Shown in the Inbox alongside everything else. */
export async function getPendingSignatures(user: CurrentUser): Promise<EmployeeDocument[]> {
  return read(() =>
    store.documents.filter(
      (d) =>
        d.employeeId === user.employee.id &&
        !d.archived &&
        d.signing?.state === 'awaiting-signature',
    ),
  );
}

export async function sendForSignature(user: CurrentUser, documentId: string, expiresOn: string): Promise<void> {
  await write(() => {
    if (user.role !== 'hr-admin') throw new Error('Only HR can send a document for signature.');
    const doc = store.documents.find((d) => d.id === documentId);
    if (!doc) throw new Error('No such document.');
    if (doc.signing?.state === 'signed') throw new Error('That document is already signed.');
    doc.signing = {
      state: 'awaiting-signature',
      sentOn: new Date().toISOString(),
      signedOn: null,
      signedBy: null,
      signatureReference: null,
      signedFrom: null,
      declinedReason: null,
      expiresOn,
    };
  });
}

/**
 * INTEGRATION POINT. With a provider wired, this is what its webhook calls.
 * Everything here is what the provider reports back, not what the app asserts.
 */
export async function recordSignature(user: CurrentUser, documentId: string): Promise<void> {
  await write(() => {
    const doc = store.documents.find((d) => d.id === documentId);
    if (!doc?.signing) throw new Error('That document is not set up for signing.');
    if (doc.signing.state === 'signed') throw new Error('Already signed — a signature record cannot be changed.');
    if (doc.employeeId !== user.employee.id) throw new Error('Only the person named on it can sign it.');
    if (doc.signing.expiresOn && doc.signing.expiresOn < MOCK_TODAY) {
      throw new Error('This expired before it was signed. Ask HR to send it again.');
    }

    doc.signing = {
      ...doc.signing,
      state: 'signed',
      signedOn: new Date().toISOString(),
      signedBy: user.employee.id,
      // Populated by the provider once one is chosen.
      signatureReference: SIGNING_PROVIDER ? `pending-${documentId}` : null,
      signedFrom: 'Recorded by the e-signature provider — no provider is wired yet',
    };
  });
}

export async function declineSignature(user: CurrentUser, documentId: string, reason: string): Promise<void> {
  await write(() => {
    const doc = store.documents.find((d) => d.id === documentId);
    if (!doc?.signing) throw new Error('That document is not set up for signing.');
    if (doc.signing.state === 'signed') throw new Error('Already signed — this cannot be changed.');
    if (!reason.trim()) throw new Error('Say why you are declining.');
    doc.signing = { ...doc.signing, state: 'declined', declinedReason: reason.trim() };
  });
}

/** The only place that answers "has this been accepted". Narrowly. */
export function isAccepted(document: EmployeeDocument): boolean {
  return document.signing?.state === 'signed';
}
