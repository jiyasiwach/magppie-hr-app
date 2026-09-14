import type { Integration, IntegrationId } from '@/lib/types';
import { read, store } from './store';

/**
 * Shapes and failure behaviour only — nothing is wired, and no vendor has been
 * chosen for any of them.
 *
 * The rule that matters and is written into every entry below: a failure is
 * never swallowed silently, and a record is never left half-written across two
 * systems. Where this app is the system of record it stays authoritative and
 * marks the other side as not-yet-delivered; where the other system is
 * authoritative this app shows that the value could not be loaded rather than
 * showing a stale one as if it were current.
 */
export async function listIntegrations(): Promise<Integration[]> {
  return read(() => [...store.integrations]);
}

export async function getIntegration(id: IntegrationId): Promise<Integration | null> {
  return read(() => store.integrations.find((i) => i.id === id) ?? null);
}
