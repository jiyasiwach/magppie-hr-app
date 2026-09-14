import type { CommitteeMember, VoiceHandler, VoiceMessage, VoiceTicket } from '@/lib/types';

const IST = '+05:30';

/**
 * ============================================================================
 * Employee Voice — mock tickets
 * ============================================================================
 * Separation of duties is deliberate and is the point of the module:
 *
 *  - VOICE HANDLERS are the only people who see the general queue. Holding an
 *    HR admin role elsewhere in the app grants nothing here.
 *  - COMMITTEE MEMBERS are the only people who see harassment tickets, and
 *    they are not the same people. Two of the three below are not in HR at all.
 *
 * Anonymous tickets carry `raiserId: null`. The identity is not stored, not
 * hidden — there is nothing in the row to reveal. Their timestamps are
 * coarsened to the start of the day so they cannot be lined up against a single
 * person's session.
 * ============================================================================
 */

/** FLAGGED: who actually handles this queue at Magppie is invented. */
export const voiceHandlers: VoiceHandler[] = [
  { id: 'vh-1', employeeId: 'emp-005', validFrom: '2026-04-01', validTo: null },
  { id: 'vh-2', employeeId: 'emp-036', validFrom: '2026-04-01', validTo: null },
];

/**
 * FLAGGED: the real Internal Committee is invented here. Under the POSH Act an
 * IC needs a presiding officer who is a woman, at least two employee members,
 * and one external member from an NGO or familiar with the issues. There is no
 * employee record for an external member, so that seat is not represented in
 * this data at all — a real deployment must handle it.
 */
export const committeeMembers: CommitteeMember[] = [
  { id: 'cm-1', employeeId: 'emp-017', validFrom: '2026-04-01', validTo: null },
  { id: 'cm-2', employeeId: 'emp-002', validFrom: '2026-04-01', validTo: null },
  { id: 'cm-3', employeeId: 'emp-034', validFrom: '2026-04-01', validTo: null },
];

export const voiceTickets: VoiceTicket[] = [
  {
    id: 'vt-1',
    referenceCode: 'VC-4K2M9Q',
    category: 'workplace',
    anonymous: false,
    raiserId: 'emp-016',
    subject: 'Extraction fan over the polishing bay has been off for a week',
    body: 'The dust extraction over bay 3 stopped working last Tuesday. We are still cutting there. Masks help but the air is visibly thick by the afternoon.',
    attachmentName: null,
    status: 'action-being-taken',
    assignedTo: 'emp-005',
    createdOn: `2026-09-02T11:20:00${IST}`,
    firstResponseOn: `2026-09-02T16:05:00${IST}`,
    closedOn: null,
    closingNote: null,
    statusNote: 'Maintenance contractor booked for 16 September. Bay 3 is out of use until then.',
  },
  {
    id: 'vt-2',
    referenceCode: 'VC-8P3XR1',
    category: 'pay-leave-attendance',
    anonymous: false,
    raiserId: 'emp-028',
    subject: 'Leave balance looks wrong after my shift change',
    body: 'I moved to the showroom group in July and my casual leave balance dropped by two days. Nobody could explain why.',
    attachmentName: null,
    status: 'in-review',
    assignedTo: 'emp-036',
    createdOn: `2026-09-08T09:45:00${IST}`,
    firstResponseOn: `2026-09-09T10:10:00${IST}`,
    closedOn: null,
    closingNote: null,
    statusNote: null,
  },
  {
    id: 'vt-3',
    referenceCode: 'VC-2H7WZ5',
    category: 'manager-team',
    anonymous: true,
    raiserId: null,
    subject: 'Shift allocation on the floor does not feel even',
    body: 'The second shift keeps going to the same few people, and it is always the ones who do not push back. I do not want to give my name because it would be obvious who I am.',
    attachmentName: null,
    status: 'submitted',
    // Coarsened to the day — see the note at the top of this file.
    createdOn: `2026-09-11T00:00:00${IST}`,
    assignedTo: null,
    firstResponseOn: null,
    closedOn: null,
    closingNote: null,
    statusNote: null,
  },
  {
    id: 'vt-4',
    referenceCode: 'VC-9D5TK8',
    category: 'suggestion',
    anonymous: false,
    raiserId: 'emp-012',
    subject: 'Put the edge profile samples in the showroom, not just the plant',
    body: 'Clients ask what a 3mm chamfer looks like and we show them a render. The samples on the QC bench are far better. Could we have a set at each showroom?',
    attachmentName: null,
    status: 'resolved',
    assignedTo: 'emp-036',
    createdOn: `2026-08-18T14:30:00${IST}`,
    firstResponseOn: `2026-08-19T09:20:00${IST}`,
    closedOn: `2026-09-01T11:00:00${IST}`,
    closingNote: 'Agreed. Three sample sets ordered, one per showroom, arriving end of September. Thank you — this was a good idea.',
    statusNote: null,
  },
  {
    id: 'vt-5',
    referenceCode: 'VC-6B1NQ4',
    category: 'policy-process',
    anonymous: false,
    raiserId: 'emp-025',
    subject: 'Can we claim travel between two client sites in a day?',
    body: 'I often go from one site to another and it is not clear whether that counts as commuting or work travel.',
    attachmentName: null,
    status: 'closed-without-action',
    assignedTo: 'emp-005',
    createdOn: `2026-08-05T10:00:00${IST}`,
    firstResponseOn: `2026-08-06T12:00:00${IST}`,
    closedOn: `2026-08-20T15:30:00${IST}`,
    closingNote: 'Closed without action because there is no expense policy yet to answer this against. It is not a no — the question is real and it is on the list for when the expense policy is written. Raise it again once that exists.',
    statusNote: null,
  },
  {
    id: 'vt-6',
    referenceCode: 'VC-3Z8YM2',
    category: 'workplace',
    anonymous: false,
    raiserId: 'emp-031',
    subject: 'No drinking water at the Golf Course Road site',
    body: 'Third week running. We are buying our own.',
    attachmentName: null,
    status: 'submitted',
    assignedTo: null,
    createdOn: `2026-08-28T08:15:00${IST}`,
    firstResponseOn: null,
    closedOn: null,
    closingNote: null,
    statusNote: null,
  },
  {
    id: 'vt-7',
    referenceCode: 'VC-5W9GJ7',
    category: 'harassment',
    anonymous: false,
    raiserId: 'emp-029',
    subject: 'Comments from a colleague on the showroom floor',
    body: 'There have been repeated remarks about my appearance in front of customers. I have asked for it to stop and it has not. I would like this looked at formally.',
    attachmentName: null,
    status: 'in-review',
    assignedTo: 'emp-017',
    createdOn: `2026-09-05T18:40:00${IST}`,
    firstResponseOn: `2026-09-06T09:00:00${IST}`,
    closedOn: null,
    closingNote: null,
    statusNote: null,
  },
  {
    id: 'vt-8',
    referenceCode: 'VC-7Q4VD3',
    category: 'harassment',
    anonymous: true,
    raiserId: null,
    subject: 'Something I want the committee to know about',
    body: 'I would rather not say who I am at this stage. I will answer questions through this thread.',
    attachmentName: null,
    status: 'submitted',
    assignedTo: null,
    createdOn: `2026-09-12T00:00:00${IST}`,
    firstResponseOn: null,
    closedOn: null,
    closingNote: null,
    statusNote: null,
  },
  {
    id: 'vt-9',
    referenceCode: 'VC-1L6RC0',
    category: 'other',
    anonymous: false,
    raiserId: 'emp-013',
    subject: 'Canteen timings clash with the second shift handover',
    body: 'The counter shuts at 14:15 and the handover finishes at 14:20. Second shift regularly misses lunch.',
    attachmentName: null,
    status: 'submitted',
    assignedTo: null,
    createdOn: `2026-08-22T13:05:00${IST}`,
    firstResponseOn: null,
    closedOn: null,
    closingNote: null,
    statusNote: null,
  },
];

export const voiceMessages: VoiceMessage[] = [
  { id: 'vm-1', ticketId: 'vt-1', authorType: 'raiser', authorId: 'emp-016', body: 'The dust extraction over bay 3 stopped working last Tuesday. We are still cutting there.', createdOn: `2026-09-02T11:20:00${IST}` },
  { id: 'vm-2', ticketId: 'vt-1', authorType: 'hr', authorId: null, body: 'Thank you for raising this. We have asked the plant to stop using bay 3 today and are getting the contractor in.', createdOn: `2026-09-02T16:05:00${IST}` },
  { id: 'vm-3', ticketId: 'vt-1', authorType: 'raiser', authorId: 'emp-016', body: 'Bay 3 is taped off since yesterday. Thanks.', createdOn: `2026-09-03T09:10:00${IST}` },
  { id: 'vm-4', ticketId: 'vt-1', authorType: 'hr', authorId: null, body: 'Contractor is booked for 16 September. We will confirm here once it is tested.', createdOn: `2026-09-04T15:40:00${IST}` },

  { id: 'vm-5', ticketId: 'vt-2', authorType: 'raiser', authorId: 'emp-028', body: 'I moved to the showroom group in July and my casual leave balance dropped by two days.', createdOn: `2026-09-08T09:45:00${IST}` },
  { id: 'vm-6', ticketId: 'vt-2', authorType: 'hr', authorId: 'emp-036', body: 'Looking into this now. The showroom group sits on a different leave policy, so there may be a legitimate reason — but a drop mid-year does not sound right and I will come back with the ledger.', createdOn: `2026-09-09T10:10:00${IST}` },

  { id: 'vm-7', ticketId: 'vt-3', authorType: 'raiser', authorId: null, body: 'The second shift keeps going to the same few people.', createdOn: `2026-09-11T00:00:00${IST}` },

  { id: 'vm-8', ticketId: 'vt-4', authorType: 'raiser', authorId: 'emp-012', body: 'Clients ask what a 3mm chamfer looks like and we show them a render.', createdOn: `2026-08-18T14:30:00${IST}` },
  { id: 'vm-9', ticketId: 'vt-4', authorType: 'hr', authorId: null, body: 'Good idea. Checking cost with the plant.', createdOn: `2026-08-19T09:20:00${IST}` },
  { id: 'vm-10', ticketId: 'vt-4', authorType: 'hr', authorId: null, body: 'Three sets ordered, one per showroom.', createdOn: `2026-09-01T11:00:00${IST}` },

  { id: 'vm-11', ticketId: 'vt-5', authorType: 'raiser', authorId: 'emp-025', body: 'I often go from one site to another in a day.', createdOn: `2026-08-05T10:00:00${IST}` },
  { id: 'vm-12', ticketId: 'vt-5', authorType: 'hr', authorId: 'emp-005', body: 'There is no expense policy in place yet, so I cannot give you an answer that would hold. I would rather say that than invent one.', createdOn: `2026-08-06T12:00:00${IST}` },

  { id: 'vm-13', ticketId: 'vt-7', authorType: 'raiser', authorId: 'emp-029', body: 'There have been repeated remarks about my appearance in front of customers.', createdOn: `2026-09-05T18:40:00${IST}` },
  { id: 'vm-14', ticketId: 'vt-7', authorType: 'hr', authorId: null, body: 'This has come to the Internal Committee and not to general HR. We will contact you directly to take your account. You may bring someone with you.', createdOn: `2026-09-06T09:00:00${IST}` },

  { id: 'vm-15', ticketId: 'vt-8', authorType: 'raiser', authorId: null, body: 'I would rather not say who I am at this stage.', createdOn: `2026-09-12T00:00:00${IST}` },
];
