import type { CurrentUser } from '@/lib/auth';
import type { VoiceCategory, VoiceMessage, VoiceStatus, VoiceTicket } from '@/lib/types';
import { MOCK_TODAY } from '@/lib/clock';
import { read, store, write } from './store';

/**
 * ============================================================================
 * Employee Voice — access rules
 * ============================================================================
 * These are enforced here, in the data layer, not in the screens. A screen that
 * forgets a check is a bug; a data layer that hands the rows over is a breach.
 *
 *  1. A person's MANAGER never sees their ticket — not the content, not its
 *     existence, not a count. There is deliberately no function in this file
 *     that takes a manager and returns tickets. The capability does not exist.
 *  2. Only assigned VOICE HANDLERS see the general queue. An `hr-admin` role
 *     elsewhere in the app grants nothing here.
 *  3. Harassment tickets go only to COMMITTEE MEMBERS and can never be moved
 *     into the general queue.
 *  4. The raiser sees their own ticket and its thread.
 *  5. Nobody else, ever.
 * ============================================================================
 */

export const HARASSMENT_CATEGORY: VoiceCategory = 'harassment';

export function isVoiceHandler(user: CurrentUser, on: string = MOCK_TODAY): boolean {
  return store.voiceHandlers.some(
    (h) => h.employeeId === user.employee.id && h.validFrom <= on && (h.validTo === null || h.validTo >= on),
  );
}

export function isCommitteeMember(user: CurrentUser, on: string = MOCK_TODAY): boolean {
  return store.committeeMembers.some(
    (m) => m.employeeId === user.employee.id && m.validFrom <= on && (m.validTo === null || m.validTo >= on),
  );
}

/** The only three ways anyone may see a ticket. */
export function canSeeTicket(user: CurrentUser, ticket: VoiceTicket): boolean {
  if (ticket.category === HARASSMENT_CATEGORY) return isCommitteeMember(user);
  if (!ticket.anonymous && ticket.raiserId === user.employee.id) return true;
  return isVoiceHandler(user);
}

// ---------------------------------------------------------------------------
// Raising
// ---------------------------------------------------------------------------

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newReferenceCode(): string {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `VC-${code}`;
}

export interface RaiseTicketInput {
  category: VoiceCategory;
  anonymous: boolean;
  subject: string;
  body: string;
  attachmentName: string | null;
}

/**
 * Anonymous tickets never carry the raiser's id, and their timestamp is
 * coarsened to the start of the day. Hiding a name at the display layer is not
 * anonymity — anyone with database access would still see it, and promising
 * otherwise is a lie the company would eventually be caught in.
 */
export async function raiseTicket(user: CurrentUser, input: RaiseTicketInput): Promise<VoiceTicket> {
  return write(() => {
    if (!input.subject.trim()) throw new Error('A subject is needed so this can be routed.');
    if (!input.body.trim()) throw new Error('Please describe what happened.');

    const nowIso = new Date().toISOString();
    const createdOn = input.anonymous ? `${nowIso.slice(0, 10)}T00:00:00+05:30` : nowIso;

    const ticket: VoiceTicket = {
      id: `vt-${Date.now()}`,
      referenceCode: newReferenceCode(),
      category: input.category,
      anonymous: input.anonymous,
      raiserId: input.anonymous ? null : user.employee.id,
      subject: input.subject.trim(),
      body: input.body.trim(),
      attachmentName: input.attachmentName,
      status: 'submitted',
      assignedTo: null,
      createdOn,
      firstResponseOn: null,
      closedOn: null,
      closingNote: null,
      statusNote: null,
    };

    store.voiceTickets.unshift(ticket);
    store.voiceMessages.push({
      id: `vm-${Date.now()}`,
      ticketId: ticket.id,
      authorType: 'raiser',
      authorId: ticket.raiserId,
      body: ticket.body,
      createdOn,
    });

    return ticket;
  });
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** A person's own tickets. Anonymous ones are not here — by design. */
export async function getMyTickets(user: CurrentUser): Promise<VoiceTicket[]> {
  return read(() =>
    store.voiceTickets
      .filter((t) => !t.anonymous && t.raiserId === user.employee.id)
      .sort((a, b) => b.createdOn.localeCompare(a.createdOn)),
  );
}

/** The only route back into an anonymous ticket. */
export async function getTicketByReference(code: string): Promise<VoiceTicket | null> {
  return read(
    () => store.voiceTickets.find((t) => t.referenceCode.toUpperCase() === code.trim().toUpperCase()) ?? null,
  );
}

export async function getTicket(user: CurrentUser, ticketId: string): Promise<VoiceTicket | null> {
  return read(() => {
    const ticket = store.voiceTickets.find((t) => t.id === ticketId);
    if (!ticket) return null;
    return canSeeTicket(user, ticket) ? ticket : null;
  });
}

export async function getMessages(ticketId: string): Promise<VoiceMessage[]> {
  return read(() =>
    store.voiceMessages
      .filter((m) => m.ticketId === ticketId)
      .sort((a, b) => a.createdOn.localeCompare(b.createdOn)),
  );
}

export interface QueueFilters {
  category?: VoiceCategory | '';
  status?: VoiceStatus | '';
}

/** The general queue. Harassment is excluded structurally, not by filter. */
export async function getHrQueue(user: CurrentUser, filters: QueueFilters = {}): Promise<VoiceTicket[]> {
  return read(() => {
    if (!isVoiceHandler(user)) return [];
    return store.voiceTickets
      .filter((t) => t.category !== HARASSMENT_CATEGORY)
      .filter((t) => (filters.category ? t.category === filters.category : true))
      .filter((t) => (filters.status ? t.status === filters.status : true))
      .sort(oldestUntouchedFirst);
  });
}

/** The committee queue. Only harassment, only committee members. */
export async function getCommitteeQueue(user: CurrentUser, filters: QueueFilters = {}): Promise<VoiceTicket[]> {
  return read(() => {
    if (!isCommitteeMember(user)) return [];
    return store.voiceTickets
      .filter((t) => t.category === HARASSMENT_CATEGORY)
      .filter((t) => (filters.status ? t.status === filters.status : true))
      .sort(oldestUntouchedFirst);
  });
}

/** Untouched and oldest to the top — the queue should nag. */
function oldestUntouchedFirst(a: VoiceTicket, b: VoiceTicket): number {
  const openA = a.status !== 'resolved' && a.status !== 'closed-without-action';
  const openB = b.status !== 'resolved' && b.status !== 'closed-without-action';
  if (openA !== openB) return openA ? -1 : 1;
  const untouchedA = a.firstResponseOn === null;
  const untouchedB = b.firstResponseOn === null;
  if (untouchedA !== untouchedB) return untouchedA ? -1 : 1;
  return a.createdOn.localeCompare(b.createdOn);
}

/** Whole days since it was raised. Drives the ageing indicator. */
export function ageInDays(ticket: VoiceTicket, on: string = MOCK_TODAY): number {
  const raised = Date.parse(ticket.createdOn.slice(0, 10));
  const now = Date.parse(on);
  return Math.max(0, Math.round((now - raised) / 86_400_000));
}

export const AGEING_THRESHOLD_DAYS = 5;

// ---------------------------------------------------------------------------
// Acting
// ---------------------------------------------------------------------------

function assertCanAct(user: CurrentUser, ticket: VoiceTicket) {
  const allowed =
    ticket.category === HARASSMENT_CATEGORY ? isCommitteeMember(user) : isVoiceHandler(user);
  if (!allowed) throw new Error('This ticket is not yours to act on.');
}

export async function replyToTicket(
  user: CurrentUser,
  ticketId: string,
  body: string,
  identifySelf: boolean,
): Promise<void> {
  await write(() => {
    const ticket = store.voiceTickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('No such ticket.');
    assertCanAct(user, ticket);
    if (!body.trim()) throw new Error('Write something before sending.');

    const createdOn = new Date().toISOString();
    store.voiceMessages.push({
      id: `vm-${Date.now()}`,
      ticketId,
      authorType: 'hr',
      // HR replies as the team unless the person chooses to be named.
      authorId: identifySelf ? user.employee.id : null,
      body: body.trim(),
      createdOn,
    });

    if (!ticket.firstResponseOn) ticket.firstResponseOn = createdOn;
    if (ticket.status === 'submitted') ticket.status = 'in-review';
  });
}

/** The raiser adding more, by ticket or by reference code. */
export async function addRaiserMessage(ticketId: string, body: string, raiserId: string | null): Promise<void> {
  await write(() => {
    const ticket = store.voiceTickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('No such ticket.');
    if (ticket.status === 'resolved' || ticket.status === 'closed-without-action') {
      throw new Error('This ticket is closed. The thread stays readable, but it cannot be added to.');
    }
    if (!body.trim()) throw new Error('Write something before sending.');
    store.voiceMessages.push({
      id: `vm-${Date.now()}`,
      ticketId,
      authorType: 'raiser',
      authorId: ticket.anonymous ? null : raiserId,
      body: body.trim(),
      createdOn: new Date().toISOString(),
    });
  });
}

/**
 * A ticket cannot reach resolved or closed without a written outcome. Silently
 * resolving something people can see was not resolved destroys trust in the
 * channel faster than anything else.
 */
export async function setTicketStatus(
  user: CurrentUser,
  ticketId: string,
  status: VoiceStatus,
  note: string,
): Promise<void> {
  await write(() => {
    const ticket = store.voiceTickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('No such ticket.');
    assertCanAct(user, ticket);

    const closing = status === 'resolved' || status === 'closed-without-action';
    if (closing && !note.trim()) {
      throw new Error(
        status === 'resolved'
          ? 'Say what was done. A ticket cannot be resolved without an outcome.'
          : 'Say why. Closing without action needs an honest reason.',
      );
    }
    if (status === 'action-being-taken' && !note.trim()) {
      throw new Error('Say briefly what is being done.');
    }

    ticket.status = status;
    if (closing) {
      ticket.closedOn = new Date().toISOString();
      ticket.closingNote = note.trim();
    } else {
      ticket.statusNote = note.trim() || null;
    }
  });
}

export async function assignTicket(user: CurrentUser, ticketId: string, toEmployeeId: string): Promise<void> {
  await write(() => {
    const ticket = store.voiceTickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('No such ticket.');
    assertCanAct(user, ticket);
    // A harassment ticket can only be assigned within the committee.
    if (ticket.category === HARASSMENT_CATEGORY) {
      const onCommittee = store.committeeMembers.some((m) => m.employeeId === toEmployeeId);
      if (!onCommittee) throw new Error('A harassment ticket can only be assigned to a committee member.');
    }
    ticket.assignedTo = toEmployeeId;
  });
}

/** Who a ticket can be assigned to, given which queue it is in. */
export async function assignableFor(ticket: VoiceTicket): Promise<string[]> {
  return read(() =>
    ticket.category === HARASSMENT_CATEGORY
      ? store.committeeMembers.map((m) => m.employeeId)
      : store.voiceHandlers.map((h) => h.employeeId),
  );
}

// ---------------------------------------------------------------------------
// Counts — volumes only, never people
// ---------------------------------------------------------------------------

export interface VoiceStats {
  raisedThisMonth: number;
  open: number;
  averageDaysToFirstReply: number | null;
  averageDaysToClose: number | null;
  ageingBeyondThreshold: number;
}

/**
 * Deliberately contains no per-employee analytics and no ranking of who raises
 * tickets. Counting complaints by person is how a listening channel becomes a
 * surveillance channel.
 */
export async function getVoiceStats(user: CurrentUser, committee: boolean): Promise<VoiceStats | null> {
  return read(() => {
    if (committee ? !isCommitteeMember(user) : !isVoiceHandler(user)) return null;
    const scope = store.voiceTickets.filter((t) =>
      committee ? t.category === HARASSMENT_CATEGORY : t.category !== HARASSMENT_CATEGORY,
    );
    const month = MOCK_TODAY.slice(0, 7);
    const days = (from: string, to: string) =>
      Math.max(0, (Date.parse(to.slice(0, 10)) - Date.parse(from.slice(0, 10))) / 86_400_000);

    const replied = scope.filter((t) => t.firstResponseOn);
    const closed = scope.filter((t) => t.closedOn);

    return {
      raisedThisMonth: scope.filter((t) => t.createdOn.startsWith(month)).length,
      open: scope.filter((t) => t.status !== 'resolved' && t.status !== 'closed-without-action').length,
      averageDaysToFirstReply: replied.length
        ? Math.round((replied.reduce((s, t) => s + days(t.createdOn, t.firstResponseOn!), 0) / replied.length) * 10) / 10
        : null,
      averageDaysToClose: closed.length
        ? Math.round((closed.reduce((s, t) => s + days(t.createdOn, t.closedOn!), 0) / closed.length) * 10) / 10
        : null,
      ageingBeyondThreshold: scope.filter(
        (t) =>
          t.status !== 'resolved' &&
          t.status !== 'closed-without-action' &&
          ageInDays(t) > AGEING_THRESHOLD_DAYS,
      ).length,
    };
  });
}
