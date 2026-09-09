import type { CurrentUser } from '@/lib/auth';
import type {
  Announcement,
  Asset,
  Employee,
  Post,
  PostComment,
  ReactionType,
} from '@/lib/types';
import { MOCK_TODAY } from '@/lib/clock';
import { read, store, write } from './store';

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

export async function getAnnouncements(): Promise<Announcement[]> {
  return read(() => [...store.announcements].sort((a, b) => b.postedOn.localeCompare(a.postedOn)));
}

/**
 * FLAGGED: who may post an announcement has never been stated. HR admin only,
 * for now, which is the narrowest sensible reading.
 */
export function canPostAnnouncement(user: CurrentUser): boolean {
  return user.role === 'hr-admin';
}

export async function createAnnouncement(authorId: string, title: string, body: string): Promise<void> {
  await write(() => {
    store.announcements.unshift({
      id: `ann-${Date.now()}`,
      authorId,
      title,
      body,
      postedOn: new Date().toISOString(),
    });
  });
}

// ---------------------------------------------------------------------------
// Wall
// ---------------------------------------------------------------------------

export async function getPosts(): Promise<Post[]> {
  return read(() => [...store.posts].sort((a, b) => b.postedOn.localeCompare(a.postedOn)));
}

export async function createPost(authorId: string, body: string, image: string | null): Promise<void> {
  await write(() => {
    store.posts.unshift({
      id: `post-${Date.now()}`,
      authorId,
      body,
      image,
      postedOn: new Date().toISOString(),
      reactions: [],
      comments: [],
    });
  });
}

/** Reacting twice removes the reaction — there is no un-react button to hunt for. */
export async function toggleReaction(postId: string, employeeId: string, type: ReactionType): Promise<void> {
  await write(() => {
    const post = store.posts.find((p) => p.id === postId);
    if (!post) return;
    let group = post.reactions.find((r) => r.type === type);
    if (!group) {
      group = { type, employeeIds: [] };
      post.reactions.push(group);
    }
    group.employeeIds = group.employeeIds.includes(employeeId)
      ? group.employeeIds.filter((id) => id !== employeeId)
      : [...group.employeeIds, employeeId];
  });
}

export async function commentOnPost(postId: string, authorId: string, body: string): Promise<void> {
  await write(() => {
    const post = store.posts.find((p) => p.id === postId);
    if (!post) return;
    const comment: PostComment = {
      id: `pc-${Date.now()}`,
      authorId,
      body,
      postedOn: new Date().toISOString(),
    };
    post.comments.push(comment);
  });
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export async function getAssets(employeeId: string): Promise<Asset[]> {
  return read(() =>
    store.assets
      .filter((a) => a.employeeId === employeeId)
      .sort((a, b) => b.assignedOn.localeCompare(a.assignedOn)),
  );
}

export async function requestAsset(employeeId: string, assetName: string, reason: string): Promise<void> {
  await write(() => {
    store.requests.unshift({
      id: `req-ast-${employeeId}-${Date.now()}`,
      type: 'asset',
      raisedBy: employeeId,
      raisedOn: new Date().toISOString(),
      currentApprover: 'emp-005',
      status: 'pending',
      payload: { assetName, category: 'other', reason },
      decisionComments: [],
    });
  });
}

// ---------------------------------------------------------------------------
// Celebrations — "Wish them"
// ---------------------------------------------------------------------------

export interface Celebration {
  employee: Employee;
  kind: 'birthday' | 'anniversary';
  /** The date it falls on this year, so it can be sorted and shown. */
  onDate: string;
  /** Years completed, for an anniversary. */
  years?: number;
}

/** Anniversary of a fixed month-day, on or after `from`, within `days`. */
function nextOccurrence(monthDay: string, from: string, days: number): string | null {
  const year = Number(from.slice(0, 4));
  for (const y of [year, year + 1]) {
    const candidate = `${y}-${monthDay}`;
    if (candidate >= from) {
      const diff =
        (Date.parse(`${candidate}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
      if (diff <= days) return candidate;
      return null;
    }
  }
  return null;
}

export async function getCelebrations(days = 21): Promise<Celebration[]> {
  return read(() => {
    const out: Celebration[] = [];
    store.employees
      .filter((e) => e.status !== 'inactive')
      .forEach((employee) => {
        const birthday = nextOccurrence(employee.dateOfBirth.slice(5), MOCK_TODAY, days);
        if (birthday) out.push({ employee, kind: 'birthday', onDate: birthday });

        const anniversary = nextOccurrence(employee.joiningDate.slice(5), MOCK_TODAY, days);
        if (anniversary) {
          const years = Number(anniversary.slice(0, 4)) - Number(employee.joiningDate.slice(0, 4));
          if (years > 0) out.push({ employee, kind: 'anniversary', onDate: anniversary, years });
        }
      });
    return out.sort((a, b) => a.onDate.localeCompare(b.onDate));
  });
}

/**
 * FLAGGED: there is no messaging in this app and nothing in section 13 to store
 * a wish in. A wish is posted to the Wall, which is the only channel that
 * exists.
 */
export async function sendWish(fromId: string, celebration: Celebration, message: string): Promise<void> {
  await createPost(fromId, message, null);
  void celebration;
}
