import type { CurrentUser } from '@/lib/auth';
import type { AssistantConversation, AssistantMessage } from '@/lib/types';
import { MOCK_TODAY } from '@/lib/clock';
import { formatDate, formatHours } from '@/lib/date';
import { read, store, write } from './store';

/**
 * ============================================================================
 * HR assistant — mock answers, real behaviour
 * ============================================================================
 * The model integration comes later. What is built now is the behaviour that
 * has to be right regardless of which model sits behind it:
 *
 *  1. TWO SOURCES ONLY — the published policy documents in this app, and the
 *     asking person's own data. Nothing else.
 *  2. EVERY ANSWER CITES the policy it came from, with a link.
 *  3. IT NEVER GUESSES. If no policy covers the question, the answer is that it
 *     is not documented — not something plausible.
 *  4. OWN DATA ONLY. It cannot answer about anyone else, including a manager
 *     asking about their own team.
 *  5. IT REFUSES AND HANDS OFF for grievances, harassment, salary disputes,
 *     termination or notice disputes, and anything asking for a legal reading.
 *  6. EVERY CONVERSATION IS LOGGED, which is useful on its own — what people
 *     ask repeatedly is a list of what the policies fail to explain.
 *
 * INTEGRATION POINT: replace `answer()` with a model call. Keep the guards —
 * they are not the model's job. Which model, and where it runs, is undecided.
 * ============================================================================
 */

export interface AssistantReply {
  body: string;
  citations: string[];
  handoff: boolean;
  /** Whether the answer actually read the asker's own records. */
  usedRecords?: boolean;
}

/** Subjects the assistant must not attempt, however it is asked. */
const REFUSE = [
  { test: /harass|posh|misconduct|inappropriate|touch|bully/i, why: 'harassment or misconduct' },
  { test: /grievance|complain|unfair|discriminat|victimi/i, why: 'a grievance' },
  { test: /salary|pay ?rise|increment|underpaid|deduct(ed|ion)? from my pay|bonus dispute/i, why: 'a pay dispute' },
  { test: /terminat|notice period dispute|fired|sack|resign(ation)? dispute|forced to leave/i, why: 'a termination or notice dispute' },
  { test: /legal|lawyer|court|labour law|sue|my rights under/i, why: 'a legal interpretation' },
];

/** Questions about other people. The assistant sees only the asker's data. */
const ABOUT_SOMEONE_ELSE =
  /\b(my team|their|his |her |someone else|other employee|colleagues?|co-?worker|teammate|who else|everyone'?s)\b/i;

/**
 * Catches a question about a named colleague.
 *
 * Without this, "what is Ramesh's leave balance" fell through to the leave
 * branch and answered with the ASKER'S OWN numbers — not a leak, but
 * misleading, which is its own kind of wrong. Anyone else's name means hand it
 * back rather than answer something adjacent.
 */
function namesSomeoneElse(question: string, user: CurrentUser): boolean {
  const q = question.toLowerCase();
  return store.employees.some((e) => {
    if (e.id === user.employee.id) return false;
    const first = e.fullName.split(' ')[0].toLowerCase();
    if (first.length < 4) return false;
    return q.includes(e.fullName.toLowerCase()) || new RegExp(`\\b${first}\\b`).test(q);
  });
}

function findPolicy(...keywords: string[]) {
  return store.policies.find((p) =>
    keywords.some((k) => p.title.toLowerCase().includes(k) || p.summary.toLowerCase().includes(k)),
  );
}

function leaveBalanceLine(user: CurrentUser): string {
  const lines = store.leaveTypes
    .map((type) => {
      const balance = store.leaveTransactions
        .filter((t) => t.employeeId === user.employee.id && t.leaveTypeId === type.id)
        .reduce((sum, t) => sum + (t.direction === 'debit' ? -t.amount : t.amount), 0);
      return balance !== 0 ? `${type.name}: ${Math.round(balance * 100) / 100} days` : null;
    })
    .filter(Boolean);
  return lines.length ? lines.join(' · ') : 'Nothing has been credited to you yet, so every balance is zero.';
}

/**
 * The mock brain. Deliberately narrow: it answers a handful of things it can
 * actually ground, and says so plainly for everything else.
 */
export function answer(user: CurrentUser, question: string): AssistantReply {
  const q = question.trim();

  for (const rule of REFUSE) {
    if (rule.test.test(q)) {
      return {
        body: `That sounds like ${rule.why}, and it needs a person rather than me. I am not going to attempt an answer — getting this wrong matters.\n\nRaise it through the confidential channel and it goes straight to the right people. Your manager is never shown any part of it.`,
        citations: [],
        handoff: true,
      };
    }
  }

  if (ABOUT_SOMEONE_ELSE.test(q) || namesSomeoneElse(q, user)) {
    return {
      body: 'I can only answer about you and your own records — not about anyone else, including your team if you manage people. For someone else’s details, their profile and your team screens are the right place, and anything beyond that goes through HR.',
      citations: [],
      handoff: false,
    };
  }

  if (/leave balance|how much leave|leave left|casual leave|sick leave|earned leave/i.test(q)) {
    const policy = findPolicy('leave');
    return {
      body: `Here is where your leave stands today:\n\n${leaveBalanceLine(user)}\n\nEvery credit and debit behind those numbers is on your Leave Balances screen, so you can check the arithmetic rather than take my word for it.`,
      citations: policy ? [policy.id] : [],
      handoff: false,
      usedRecords: true,
    };
  }

  if (/hours (today|so far)|clocked in|worked today|attendance today/i.test(q)) {
    const day = store.attendanceDays.find(
      (d) => d.employeeId === user.employee.id && d.date === MOCK_TODAY,
    );
    const policy = findPolicy('attendance', 'shift');
    return {
      body: day
        ? `Today is recorded as ${day.status.replace('-', ' ')}, with ${formatHours(day.totalHours)} logged so far.`
        : 'There is no attendance record for you today yet.',
      citations: policy ? [policy.id] : [],
      handoff: false,
      usedRecords: true,
    };
  }

  if (/notice period|resign|serve notice/i.test(q)) {
    return {
      body: 'The notice period is not written down in any policy published in this app, so I am not going to state one. Guessing at a notice period is exactly the kind of answer that turns into a dispute later.\n\nHR can tell you what your contract says.',
      citations: [],
      handoff: true,
    };
  }

  if (/travel|reimburse|expense|claim/i.test(q)) {
    return {
      body: 'There is no expense policy published yet, so there is nothing for me to answer from. Claims cannot be raised in the app for the same reason.\n\nIf you need a decision on a specific journey, ask HR and it can be handled case by case until the policy exists.',
      citations: [],
      handoff: true,
    };
  }

  if (/holiday|festival|day off|holidays/i.test(q)) {
    const next = store.holidays.filter((h) => h.date >= MOCK_TODAY).sort((a, b) => a.date.localeCompare(b.date))[0];
    const policy = findPolicy('leave');
    return {
      body: next
        ? `The next holiday is ${next.name} on ${formatDate(next.date)}${next.optional ? ', which is an optional one — take it through the normal leave flow' : ''}. The full list is under Me → Time.`
        : 'There are no holidays left on the published calendar for this year.',
      citations: policy ? [policy.id] : [],
      handoff: false,
    };
  }

  if (/safety|ppe|mask|dust|machine/i.test(q)) {
    const policy = findPolicy('safety');
    return policy
      ? {
          body: `${policy.summary}\n\nThe full policy is published in the app — worth reading it rather than relying on my summary.`,
          citations: [policy.id],
          handoff: false,
        }
      : { body: 'There is no safety policy published in the app, so I have nothing to answer from.', citations: [], handoff: true };
  }

  if (/regularis|wrong day|missed punch|forgot to punch/i.test(q)) {
    const policy = findPolicy('attendance');
    return {
      body: 'If a day looks wrong, open it under Me → Time → Logs and shifts, and raise a regularisation from that day with a reason. It goes to your reporting manager. A day with a missing out-punch records zero hours until it is fixed — it is not treated as absence.',
      citations: policy ? [policy.id] : [],
      handoff: false,
    };
  }

  return {
    body: 'I do not know, and I would rather say so than invent something.\n\nI can only answer from the policies published in this app and from your own records. If this is covered by a policy that has not been published here, it is not something I can see.',
    citations: [],
    handoff: true,
  };
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export async function getConversation(user: CurrentUser, conversationId: string | null): Promise<AssistantConversation | null> {
  return read(() => {
    if (!conversationId) return null;
    const c = store.assistantConversations.find((x) => x.id === conversationId);
    if (!c) return null;
    return c.employeeId === user.employee.id || user.role === 'hr-admin' ? c : null;
  });
}

export async function startConversation(user: CurrentUser): Promise<AssistantConversation> {
  return write(() => {
    const conversation: AssistantConversation = {
      id: `ac-${Date.now()}`,
      employeeId: user.employee.id,
      startedOn: new Date().toISOString(),
      messages: [],
      endedInHandoff: false,
    };
    store.assistantConversations.unshift(conversation);
    return conversation;
  });
}

export async function ask(user: CurrentUser, conversationId: string, question: string): Promise<void> {
  await write(() => {
    const conversation = store.assistantConversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error('No such conversation.');
    if (conversation.employeeId !== user.employee.id) throw new Error('That is not your conversation.');
    if (!question.trim()) return;

    const now = new Date().toISOString();
    const asked: AssistantMessage = {
      id: `am-${Date.now()}`,
      role: 'person',
      body: question.trim(),
      citations: [],
      createdOn: now,
      handoff: false,
    };
    const reply = answer(user, question);
    const replied: AssistantMessage = {
      id: `am-${Date.now() + 1}`,
      role: 'assistant',
      body: reply.body,
      citations: reply.citations,
      createdOn: now,
      handoff: reply.handoff,
      usedRecords: reply.usedRecords ?? false,
    };

    conversation.messages.push(asked, replied);
    conversation.endedInHandoff = reply.handoff;
  });
}

/** What people keep asking is a list of what the policies fail to explain. */
export async function getConversationLog(user: CurrentUser): Promise<AssistantConversation[]> {
  return read(() => {
    if (user.role !== 'hr-admin') return [];
    return [...store.assistantConversations].sort((a, b) => b.startedOn.localeCompare(a.startedOn));
  });
}
