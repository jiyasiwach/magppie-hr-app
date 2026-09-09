import type { Policy, PolicyAcknowledgement } from '@/lib/types';

/**
 * Short, plausible policy text so that "read and acknowledge" means something.
 * Placeholder wording written for this build — not legal text, and not the
 * company's actual policies.
 */
export const policies: Policy[] = [
  {
    id: 'pol-code-of-conduct',
    title: 'Code of Conduct',
    version: 'v3.1',
    publishedOn: '2026-04-01',
    summary: 'How we expect people to behave with clients, on site, and with each other.',
    body: [
      'This policy applies to everyone on the payroll, at every location — head office, the Noida plant, every showroom, and any client site we are working on.',
      'Treat colleagues, clients and contractors with the same courtesy you would expect. Harassment, discrimination and intimidation are grounds for disciplinary action, whatever the seniority of the people involved.',
      'Client drawings, pricing and site addresses are confidential. Do not share them outside the company, including in personal messaging groups.',
      'If you are offered a gift or hospitality by a supplier that is worth more than a modest courtesy, declare it to your manager before accepting.',
      'If you are unsure whether something breaches this policy, ask HR before doing it rather than after.',
    ],
  },
  {
    id: 'pol-leave',
    title: 'Leave Policy',
    version: 'v2.0',
    publishedOn: '2026-04-01',
    summary: 'Leave types, accrual, approval routing and the notice expected before applying.',
    body: [
      'Casual, sick and earned leave accrue monthly and are credited on the first of each month. Leave without pay does not accrue and may take your balance negative.',
      'Apply through this app. Leave is approved by your reporting manager, and their decision is recorded against the request along with any comment they leave.',
      'Planned leave should be applied for with reasonable notice so that showroom and site cover can be arranged. Sick leave can be applied for after the fact.',
      'Half days are available on casual, sick and leave without pay. Earned leave is taken in full days.',
      'Unused balance at the end of the leave year is handled under the carry-forward rules, which are being revised and are not reflected in this app yet.',
    ],
  },
  {
    id: 'pol-attendance',
    title: 'Attendance & Shift Policy',
    version: 'v1.4',
    publishedOn: '2026-04-01',
    summary: 'Shift timings by site, punch rules, and how a wrong day gets regularised.',
    body: [
      'Punch in when you start and punch out when you finish, from the biometric reader where there is one, and from this app where there is not.',
      'Site and installation staff who go straight to a client site should punch from mobile at the site rather than travelling to the office to punch.',
      'If a day is recorded wrongly — a missed punch, a reader that did not register — raise a regularisation from that day and say what happened. Your manager approves it.',
      'A day with an in-punch and no out-punch records zero hours until it is regularised. It is not treated as absence, but it does need fixing.',
      'Shift timings differ by location and are maintained by HR. They are not yet reflected in this app.',
    ],
  },
  {
    id: 'pol-factory-safety',
    title: 'Factory Floor Safety',
    version: 'v2.2',
    publishedOn: '2026-05-15',
    summary: 'PPE, stone handling, machine lock-out and incident reporting at the Noida plant.',
    body: [
      'Safety shoes and eye protection are mandatory anywhere on the production floor, including for visitors and for office staff walking through.',
      'Cutting, edge polishing and dry grinding require respiratory protection. Stone dust is a long-term health risk, not a nuisance.',
      'Engineered stone slabs are heavy and break in ways that injure. Never lift or turn a slab alone, and never stand a slab unsecured.',
      'Machines must be locked out before any maintenance or blade change. The person doing the work holds the key.',
      'Report every incident and every near miss to your supervisor the same day, however minor it looks.',
    ],
  },
  {
    id: 'pol-it-usage',
    title: 'IT & Data Usage',
    version: 'v1.1',
    publishedOn: '2026-02-10',
    summary: 'Devices, client drawings, and what may not leave the company network.',
    body: [
      'Company devices are for company work. Keep them locked when unattended and report a lost or stolen device immediately.',
      'Client drawings, quotations and customer contact details must stay on company systems. Do not copy them to personal drives, personal email or messaging apps.',
      'Use your own account. Sharing logins makes it impossible to tell who did what, which matters when something goes wrong.',
      'Software is installed by IT. Do not install tools that handle client data without asking first.',
    ],
  },
  {
    id: 'pol-posh',
    title: 'Prevention of Sexual Harassment',
    version: 'v2.0',
    publishedOn: '2026-04-01',
    summary: 'The internal committee, how to raise a complaint, and how it is handled.',
    body: [
      'Sexual harassment at work is prohibited and will be acted on. This applies at every location, at client sites, and at any work-related event off the premises.',
      'An Internal Committee is constituted to receive and inquire into complaints. Its current members are listed on the notice board at each location and with HR.',
      'A complaint may be made to any committee member, in writing or verbally. You may bring someone with you.',
      'Complaints are handled confidentially. Retaliation against anyone who raises a complaint, or who takes part in an inquiry, is itself a disciplinary matter.',
      'Nothing in this policy prevents anyone from pursuing remedies available in law.',
    ],
  },
];

export const policyAcknowledgements: PolicyAcknowledgement[] = [
  { id: 'pa-1', policyId: 'pol-code-of-conduct', employeeId: 'emp-008', acknowledgedOn: '2026-04-03T10:12:00+05:30' },
  { id: 'pa-2', policyId: 'pol-leave', employeeId: 'emp-008', acknowledgedOn: '2026-04-03T10:14:00+05:30' },
  { id: 'pa-3', policyId: 'pol-posh', employeeId: 'emp-008', acknowledgedOn: '2026-04-03T10:16:00+05:30' },
  { id: 'pa-4', policyId: 'pol-code-of-conduct', employeeId: 'emp-003', acknowledgedOn: '2026-04-02T09:05:00+05:30' },
  { id: 'pa-5', policyId: 'pol-factory-safety', employeeId: 'emp-003', acknowledgedOn: '2026-05-16T08:40:00+05:30' },
  { id: 'pa-6', policyId: 'pol-leave', employeeId: 'emp-003', acknowledgedOn: '2026-04-02T09:07:00+05:30' },
  { id: 'pa-7', policyId: 'pol-code-of-conduct', employeeId: 'emp-005', acknowledgedOn: '2026-04-01T18:00:00+05:30' },
  { id: 'pa-8', policyId: 'pol-leave', employeeId: 'emp-005', acknowledgedOn: '2026-04-01T18:01:00+05:30' },
  { id: 'pa-9', policyId: 'pol-attendance', employeeId: 'emp-005', acknowledgedOn: '2026-04-01T18:02:00+05:30' },
  { id: 'pa-10', policyId: 'pol-it-usage', employeeId: 'emp-005', acknowledgedOn: '2026-04-01T18:03:00+05:30' },
  { id: 'pa-11', policyId: 'pol-posh', employeeId: 'emp-005', acknowledgedOn: '2026-04-01T18:04:00+05:30' },
  { id: 'pa-12', policyId: 'pol-factory-safety', employeeId: 'emp-005', acknowledgedOn: '2026-05-15T18:05:00+05:30' },
];
