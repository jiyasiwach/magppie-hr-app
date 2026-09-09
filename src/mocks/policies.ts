import type { Policy, PolicyAcknowledgement } from '@/lib/types';

export const policies: Policy[] = [
  { id: 'pol-code-of-conduct', title: 'Code of Conduct', version: 'v3.1', publishedOn: '2026-04-01', summary: 'How we expect people to behave with clients, on site, and with each other.' },
  { id: 'pol-leave', title: 'Leave Policy', version: 'v2.0', publishedOn: '2026-04-01', summary: 'Leave types, accrual, approval routing and the notice expected before applying.' },
  { id: 'pol-attendance', title: 'Attendance & Shift Policy', version: 'v1.4', publishedOn: '2026-04-01', summary: 'Shift timings by site, punch rules, and how a wrong day gets regularised.' },
  { id: 'pol-factory-safety', title: 'Factory Floor Safety', version: 'v2.2', publishedOn: '2026-05-15', summary: 'PPE, stone handling, machine lock-out and incident reporting at the Noida plant.' },
  { id: 'pol-it-usage', title: 'IT & Data Usage', version: 'v1.1', publishedOn: '2026-02-10', summary: 'Devices, client drawings, and what may not leave the company network.' },
  { id: 'pol-posh', title: 'Prevention of Sexual Harassment', version: 'v2.0', publishedOn: '2026-04-01', summary: 'The internal committee, how to raise a complaint, and how it is handled.' },
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
