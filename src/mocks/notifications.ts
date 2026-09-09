import type { Notification } from '@/lib/types';

export const notifications: Notification[] = [
  { id: 'ntf-1', recipientId: 'emp-008', title: 'Leave approved', body: 'Your casual leave for 21 Aug 2026 was approved by Ananya Iyer.', createdOn: '2026-08-18T15:20:00+05:30', read: true },
  { id: 'ntf-2', recipientId: 'emp-008', title: 'Policy needs acknowledgement', body: 'Attendance & Shift Policy v1.4 is pending your acknowledgement.', createdOn: '2026-09-01T09:00:00+05:30', read: false },
  { id: 'ntf-3', recipientId: 'emp-008', title: 'Missing out-punch', body: 'Your 28 Aug 2026 attendance has no out-punch. Raise a regularisation if this is wrong.', createdOn: '2026-08-29T09:30:00+05:30', read: false },

  { id: 'ntf-4', recipientId: 'emp-003', title: '3 requests waiting on you', body: 'Your team has pending leave and regularisation requests.', createdOn: '2026-09-09T08:15:00+05:30', read: false },
  { id: 'ntf-5', recipientId: 'emp-003', title: 'Two people off on the same day', body: 'Sunil Kamble and Anil Prasad have both applied for 18 Sep 2026.', createdOn: '2026-09-07T17:40:00+05:30', read: false },
  { id: 'ntf-6', recipientId: 'emp-003', title: 'Factory safety policy published', body: 'Factory Floor Safety v2.2 is live. Your team needs to acknowledge it.', createdOn: '2026-05-15T10:00:00+05:30', read: true },

  { id: 'ntf-7', recipientId: 'emp-005', title: 'Probation ending soon', body: 'Zoya Khan’s probation ends on 30 Nov 2026.', createdOn: '2026-09-08T10:00:00+05:30', read: false },
  { id: 'ntf-8', recipientId: 'emp-005', title: 'Profile change request', body: 'Pooja Bhatt has requested a phone number change.', createdOn: '2026-09-05T16:11:00+05:30', read: false },
  { id: 'ntf-9', recipientId: 'emp-005', title: 'Notice period started', body: 'Nitin Bhardwaj is now on notice. Exit checklist not yet built.', createdOn: '2026-09-01T11:30:00+05:30', read: true },
];
