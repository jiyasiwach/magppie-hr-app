import type { Announcement, Asset, AssetCategory, Post } from '@/lib/types';
import { employees } from './employees';
import { intBetween, makeRng, pick } from './seed';

// ---------------------------------------------------------------------------
// 13.11 Assets
// ---------------------------------------------------------------------------

const catalogue: Array<{ name: string; category: AssetCategory }> = [
  { name: 'Dell Latitude 5450', category: 'laptop' },
  { name: 'MacBook Air M3', category: 'laptop' },
  { name: 'Samsung Galaxy A55', category: 'phone' },
  { name: 'Showroom iPad', category: 'other' },
  { name: 'Biometric access card', category: 'access' },
  { name: 'Factory floor access card', category: 'access' },
  { name: 'Bosch laser measure', category: 'tool' },
  { name: 'Slab-lifting clamp set', category: 'tool' },
  { name: 'Site tool kit', category: 'tool' },
  { name: 'Tata Ace — installation van', category: 'vehicle' },
];

function buildAssets(): Asset[] {
  const out: Asset[] = [];
  employees
    .filter((e) => e.status !== 'inactive')
    .forEach((employee) => {
      const rng = makeRng(`asset:${employee.id}`);
      const count = intBetween(rng, 1, 3);
      for (let i = 0; i < count; i += 1) {
        const item = pick(rng, catalogue);
        out.push({
          id: `ast-${employee.id}-${i}`,
          employeeId: employee.id,
          name: item.name,
          category: item.category,
          serial: `MG-${item.category.slice(0, 3).toUpperCase()}-${intBetween(rng, 10000, 99999)}`,
          assignedOn: employee.joiningDate,
          status: rng() < 0.08 ? 'in-repair' : 'assigned',
        });
      }
    });

  // One returned asset so the status is visible somewhere real.
  out.push({
    id: 'ast-emp-008-returned',
    employeeId: 'emp-008',
    name: 'Dell Latitude 5420',
    category: 'laptop',
    serial: 'MG-LAP-40912',
    assignedOn: '2019-06-17',
    status: 'returned',
  });

  return out;
}

export const assets: Asset[] = buildAssets();

// ---------------------------------------------------------------------------
// 13.13 Announcements
// ---------------------------------------------------------------------------

export const announcements: Announcement[] = [
  {
    id: 'ann-1',
    authorId: 'emp-005',
    title: 'Diwali holiday list is out',
    body: 'The holiday calendar for the rest of the year is now on the app under Me → Time → Upcoming holidays. Optional holidays are marked as such — take them through the normal leave flow.',
    postedOn: '2026-09-08T11:00:00+05:30',
  },
  {
    id: 'ann-2',
    authorId: 'emp-003',
    title: 'Slab store reorganised at the Noida plant',
    body: 'Racks 4 to 9 have moved to the far end. Picking lists have been updated. If a slab is not where the list says, tell the store keeper rather than hunting for it.',
    postedOn: '2026-09-05T09:15:00+05:30',
  },
  {
    id: 'ann-3',
    authorId: 'emp-005',
    title: 'Attendance is moving to this app',
    body: 'From this month, regularisation requests come through here rather than over email. Your manager sees them in their Inbox. Anything already sent by email has been carried over.',
    postedOn: '2026-09-01T10:00:00+05:30',
  },
  {
    id: 'ann-4',
    authorId: 'emp-007',
    title: 'Site safety briefing — every Monday, 8:30',
    body: 'Installation and site staff: the Monday briefing is now compulsory and is counted as work time. Punch in at the site before it starts.',
    postedOn: '2026-08-24T17:40:00+05:30',
  },
];

// ---------------------------------------------------------------------------
// 13.14 Wall posts
// ---------------------------------------------------------------------------

export const posts: Post[] = [
  {
    id: 'post-1',
    authorId: 'emp-002',
    body: 'The Al Wasl kitchen went out this morning — full stone wrap, one-piece island facia, no joints on the visible run. Thanks to production for the turnaround on the polishing.',
    image: 'Photograph: finished island under showroom lighting',
    postedOn: '2026-09-09T09:40:00+05:30',
    reactions: [
      { type: 'like', employeeIds: ['emp-008', 'emp-012', 'emp-003', 'emp-016', 'emp-004'] },
      { type: 'celebrate', employeeIds: ['emp-001', 'emp-022'] },
    ],
    comments: [
      { id: 'pc-1', authorId: 'emp-016', body: 'Three days on the edge polish. Worth it.', postedOn: '2026-09-09T10:02:00+05:30' },
      { id: 'pc-2', authorId: 'emp-004', body: 'Client sent a note this morning. Very happy.', postedOn: '2026-09-09T10:20:00+05:30' },
    ],
  },
  {
    id: 'post-2',
    authorId: 'emp-005',
    body: 'Welcome to Farhan Ali, who joined the design team in July, and Zoya Khan, who is with us at the Delhi showroom. Say hello if you have not met them yet.',
    image: null,
    postedOn: '2026-09-07T12:00:00+05:30',
    reactions: [{ type: 'like', employeeIds: ['emp-008', 'emp-009', 'emp-010', 'emp-022', 'emp-028'] }],
    comments: [
      { id: 'pc-3', authorId: 'emp-022', body: 'Zoya has picked up the showroom floor quickly.', postedOn: '2026-09-07T13:10:00+05:30' },
    ],
  },
  {
    id: 'post-3',
    authorId: 'emp-014',
    body: 'New edge profile samples are on the bench by the QC desk. Designers — come and feel them before specifying, the 3mm chamfer reads very differently in person.',
    image: 'Photograph: six edge profile samples in a row',
    postedOn: '2026-09-04T16:25:00+05:30',
    reactions: [{ type: 'like', employeeIds: ['emp-008', 'emp-013'] }],
    comments: [],
  },
  {
    id: 'post-4',
    authorId: 'emp-040',
    body: 'The new showroom photography is live on the website. If you are sending a client a link this week, use the updated gallery rather than the old PDF.',
    image: null,
    postedOn: '2026-09-02T15:00:00+05:30',
    reactions: [
      { type: 'like', employeeIds: ['emp-004', 'emp-023', 'emp-025'] },
      { type: 'support', employeeIds: ['emp-022'] },
    ],
    comments: [],
  },
];
