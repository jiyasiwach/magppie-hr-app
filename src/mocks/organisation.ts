import type {
  ApprovalChain,
  ApprovalStep,
  AttendancePolicy,
  Delegation,
  Entity,
  HolidayCalendar,
  LeavePolicy,
  PolicyGroup,
  WeekOffPattern,
} from '@/lib/types';

/**
 * ============================================================================
 * INVENTED POLICY — every rule in this file is a placeholder
 * ============================================================================
 * Magppie has not written any of this down. The entities, the policy groups,
 * the accrual rates, the grace periods, the approval chains and the thresholds
 * below are plausible, internally consistent guesses that exist so the screens
 * and the back end have something to build against.
 *
 * Every one of them is listed in the handover report so HR can replace it with
 * the real rule. None of it should be presented to anyone as confirmed policy.
 * ============================================================================
 */

/** 6.1 Entities. Which companies exist is invented. */
export const entities: Entity[] = [
  {
    id: 'ent-stone',
    legalName: 'Magppie SilverStone Private Limited',
    shortName: 'SilverStone',
    registrationNumber: 'U26999DL2014PTC000001',
    gstin: '09AAACM0000A1Z1',
    pan: 'AAACM0000A',
    registeredAddress: 'Plot 14, Sector 63, Noida, Uttar Pradesh 201301',
    locations: ['Noida Factory'],
    active: true,
  },
  {
    id: 'ent-interiors',
    legalName: 'Magppie Interiors Private Limited',
    shortName: 'Interiors',
    registrationNumber: 'U36900HR2016PTC000002',
    gstin: '06AAACM0000B1Z2',
    pan: 'AAACM0000B',
    registeredAddress: 'Tower B, Golf Course Road, Gurugram, Haryana 122002',
    locations: ['Head Office — Gurugram', 'Delhi Showroom', 'Mumbai Showroom'],
    active: true,
  },
  {
    id: 'ent-install',
    legalName: 'Magppie Installations LLP',
    shortName: 'Installations',
    registrationNumber: 'AAB-1234',
    gstin: '06AAACM0000C1Z3',
    pan: 'AAACM0000C',
    registeredAddress: 'Tower B, Golf Course Road, Gurugram, Haryana 122002',
    locations: ['Site — NCR', 'Site — Mumbai'],
    active: true,
  },
];

/**
 * FLAGGED: one calendar per entity. Magppie has staff in NCR and Mumbai inside
 * the same entity, and those states do not share a holiday list. If that
 * matters, the calendar needs to hang off location rather than entity.
 */
export const holidayCalendars: HolidayCalendar[] = [
  { id: 'cal-stone', name: 'SilverStone — Uttar Pradesh', entityId: 'ent-stone' },
  { id: 'cal-interiors', name: 'Interiors — national', entityId: 'ent-interiors' },
  { id: 'cal-install', name: 'Installations — national', entityId: 'ent-install' },
];

export const weekOffPatterns: WeekOffPattern[] = [
  { id: 'wop-sat-sun', name: 'Saturday and Sunday', days: [0, 6], alternateSaturdays: [] },
  { id: 'wop-sun-alt-sat', name: 'Sunday, and 2nd and 4th Saturday', days: [0], alternateSaturdays: [2, 4] },
  { id: 'wop-sun', name: 'Sunday only', days: [0], alternateSaturdays: [] },
  { id: 'wop-tue', name: 'Tuesday (showroom week)', days: [2], alternateSaturdays: [] },
];

/** 6.3 Leave policies. Accrual rates and carry-forward caps are invented. */
export const leavePolicies: LeavePolicy[] = [
  {
    id: 'lp-office',
    name: 'Office and design',
    entityId: 'ent-interiors',
    rules: [
      { leaveTypeId: 'lt-casual', accrualRate: 1, accrualFrequency: 'monthly', maxCarryForward: 6, encashable: false, canGoNegative: false, maxNegativeDays: 0 },
      { leaveTypeId: 'lt-sick', accrualRate: 0.5, accrualFrequency: 'monthly', maxCarryForward: 12, encashable: false, canGoNegative: false, maxNegativeDays: 0 },
      { leaveTypeId: 'lt-earned', accrualRate: 1.25, accrualFrequency: 'monthly', maxCarryForward: 30, encashable: true, canGoNegative: false, maxNegativeDays: 0 },
      { leaveTypeId: 'lt-unpaid', accrualRate: 0, accrualFrequency: 'none', maxCarryForward: 0, encashable: false, canGoNegative: true, maxNegativeDays: 30 },
      { leaveTypeId: 'lt-maternity', accrualRate: 0, accrualFrequency: 'none', maxCarryForward: 0, encashable: false, canGoNegative: false, maxNegativeDays: 0 },
      { leaveTypeId: 'lt-paternity', accrualRate: 0, accrualFrequency: 'none', maxCarryForward: 0, encashable: false, canGoNegative: false, maxNegativeDays: 0 },
    ],
  },
  {
    id: 'lp-factory',
    name: 'Factory floor',
    entityId: 'ent-stone',
    rules: [
      { leaveTypeId: 'lt-casual', accrualRate: 1, accrualFrequency: 'monthly', maxCarryForward: 0, encashable: false, canGoNegative: false, maxNegativeDays: 0 },
      { leaveTypeId: 'lt-sick', accrualRate: 0.5, accrualFrequency: 'monthly', maxCarryForward: 6, encashable: false, canGoNegative: false, maxNegativeDays: 0 },
      { leaveTypeId: 'lt-earned', accrualRate: 1.75, accrualFrequency: 'monthly', maxCarryForward: 45, encashable: true, canGoNegative: false, maxNegativeDays: 0 },
      { leaveTypeId: 'lt-unpaid', accrualRate: 0, accrualFrequency: 'none', maxCarryForward: 0, encashable: false, canGoNegative: true, maxNegativeDays: 15 },
      { leaveTypeId: 'lt-maternity', accrualRate: 0, accrualFrequency: 'none', maxCarryForward: 0, encashable: false, canGoNegative: false, maxNegativeDays: 0 },
      { leaveTypeId: 'lt-paternity', accrualRate: 0, accrualFrequency: 'none', maxCarryForward: 0, encashable: false, canGoNegative: false, maxNegativeDays: 0 },
    ],
  },
  {
    id: 'lp-site',
    name: 'Site and installation',
    entityId: 'ent-install',
    rules: [
      { leaveTypeId: 'lt-casual', accrualRate: 1, accrualFrequency: 'monthly', maxCarryForward: 3, encashable: false, canGoNegative: false, maxNegativeDays: 0 },
      { leaveTypeId: 'lt-sick', accrualRate: 0.5, accrualFrequency: 'monthly', maxCarryForward: 6, encashable: false, canGoNegative: false, maxNegativeDays: 0 },
      { leaveTypeId: 'lt-earned', accrualRate: 1.5, accrualFrequency: 'monthly', maxCarryForward: 30, encashable: true, canGoNegative: false, maxNegativeDays: 0 },
      { leaveTypeId: 'lt-unpaid', accrualRate: 0, accrualFrequency: 'none', maxCarryForward: 0, encashable: false, canGoNegative: true, maxNegativeDays: 20 },
      { leaveTypeId: 'lt-maternity', accrualRate: 0, accrualFrequency: 'none', maxCarryForward: 0, encashable: false, canGoNegative: false, maxNegativeDays: 0 },
      { leaveTypeId: 'lt-paternity', accrualRate: 0, accrualFrequency: 'none', maxCarryForward: 0, encashable: false, canGoNegative: false, maxNegativeDays: 0 },
    ],
  },
];

/** 6.4 Attendance policies. Grace periods and late rules are invented. */
export const attendancePolicies: AttendancePolicy[] = [
  { id: 'ap-office', name: 'Office — flexible', entityId: 'ent-interiors', shiftId: 'sh-general', graceMinutes: 15, halfDayThresholdHours: 4, fullDayThresholdHours: 8, lateMarksBeforeDeduction: 3, lateDeductionLeaveTypeId: 'lt-casual', lateDeductionDays: 0.5 },
  { id: 'ap-showroom', name: 'Showroom', entityId: 'ent-interiors', shiftId: 'sh-showroom', graceMinutes: 10, halfDayThresholdHours: 4, fullDayThresholdHours: 8, lateMarksBeforeDeduction: 3, lateDeductionLeaveTypeId: 'lt-casual', lateDeductionDays: 0.5 },
  { id: 'ap-factory-a', name: 'Factory — first shift', entityId: 'ent-stone', shiftId: 'sh-factory-a', graceMinutes: 5, halfDayThresholdHours: 4, fullDayThresholdHours: 8, lateMarksBeforeDeduction: 2, lateDeductionLeaveTypeId: 'lt-casual', lateDeductionDays: 0.5 },
  { id: 'ap-factory-b', name: 'Factory — second shift', entityId: 'ent-stone', shiftId: 'sh-factory-b', graceMinutes: 5, halfDayThresholdHours: 4, fullDayThresholdHours: 8, lateMarksBeforeDeduction: 2, lateDeductionLeaveTypeId: 'lt-casual', lateDeductionDays: 0.5 },
  { id: 'ap-site', name: 'Site', entityId: 'ent-install', shiftId: 'sh-site', graceMinutes: 30, halfDayThresholdHours: 4, fullDayThresholdHours: 8, lateMarksBeforeDeduction: 0, lateDeductionLeaveTypeId: null, lateDeductionDays: 0 },
];

/** 6.2 Policy groups. Which groups exist, and who belongs to them, is invented. */
export const policyGroups: PolicyGroup[] = [
  {
    id: 'pg-office',
    entityId: 'ent-interiors',
    name: 'Office and design',
    description: 'Head office, design, finance, HR, procurement and marketing.',
    leavePolicyId: 'lp-office',
    attendancePolicyId: 'ap-office',
    holidayCalendarId: 'cal-interiors',
    weekOffPatternId: 'wop-sat-sun',
  },
  {
    id: 'pg-showroom',
    entityId: 'ent-interiors',
    name: 'Showroom',
    description: 'Showroom floor staff, who work weekends and take a weekday off.',
    leavePolicyId: 'lp-office',
    attendancePolicyId: 'ap-showroom',
    holidayCalendarId: 'cal-interiors',
    weekOffPatternId: 'wop-tue',
  },
  {
    id: 'pg-factory-a',
    entityId: 'ent-stone',
    name: 'Factory — first shift',
    description: 'Production floor, 08:00 start, six-day week.',
    leavePolicyId: 'lp-factory',
    attendancePolicyId: 'ap-factory-a',
    holidayCalendarId: 'cal-stone',
    weekOffPatternId: 'wop-sun-alt-sat',
  },
  {
    id: 'pg-factory-b',
    entityId: 'ent-stone',
    name: 'Factory — second shift',
    description: 'Production floor, 14:00 start, six-day week.',
    leavePolicyId: 'lp-factory',
    attendancePolicyId: 'ap-factory-b',
    holidayCalendarId: 'cal-stone',
    weekOffPatternId: 'wop-sun-alt-sat',
  },
  {
    id: 'pg-site',
    entityId: 'ent-install',
    name: 'Site and installation',
    description: 'Installers and site coordinators, working from client sites.',
    leavePolicyId: 'lp-site',
    attendancePolicyId: 'ap-site',
    holidayCalendarId: 'cal-install',
    weekOffPatternId: 'wop-sun',
  },
];

/** Which department lands in which entity and group. Invented mapping. */
export const departmentPlacement: Record<string, { entityId: string; policyGroupId: string }> = {
  Production: { entityId: 'ent-stone', policyGroupId: 'pg-factory-a' },
  Installation: { entityId: 'ent-install', policyGroupId: 'pg-site' },
  Sales: { entityId: 'ent-interiors', policyGroupId: 'pg-showroom' },
  Design: { entityId: 'ent-interiors', policyGroupId: 'pg-office' },
  Finance: { entityId: 'ent-interiors', policyGroupId: 'pg-office' },
  'Human Resources': { entityId: 'ent-interiors', policyGroupId: 'pg-office' },
  Procurement: { entityId: 'ent-interiors', policyGroupId: 'pg-office' },
  Marketing: { entityId: 'ent-interiors', policyGroupId: 'pg-office' },
  Leadership: { entityId: 'ent-interiors', policyGroupId: 'pg-office' },
};

/** 6.5 Approval chains. Every chain and threshold below is invented. */
export const approvalChains: ApprovalChain[] = [
  { id: 'ch-leave-office', name: 'Leave — office and design', requestType: 'leave', entityId: null, policyGroupId: 'pg-office' },
  { id: 'ch-leave-factory', name: 'Leave — factory', requestType: 'leave', entityId: null, policyGroupId: 'pg-factory-a' },
  { id: 'ch-leave-default', name: 'Leave — everyone else', requestType: 'leave', entityId: null, policyGroupId: null },
  { id: 'ch-reg', name: 'Regularisation', requestType: 'regularisation', entityId: null, policyGroupId: null },
  { id: 'ch-wfh', name: 'Work from home', requestType: 'wfh', entityId: null, policyGroupId: null },
  { id: 'ch-onduty', name: 'On duty', requestType: 'on-duty', entityId: null, policyGroupId: null },
  { id: 'ch-overtime', name: 'Overtime', requestType: 'overtime', entityId: null, policyGroupId: null },
  { id: 'ch-partial', name: 'Partial day', requestType: 'partial-day', entityId: null, policyGroupId: null },
  { id: 'ch-asset', name: 'Asset request', requestType: 'asset', entityId: null, policyGroupId: null },
  { id: 'ch-expense', name: 'Expense claim', requestType: 'expense', entityId: null, policyGroupId: null },
  { id: 'ch-profile', name: 'Profile change', requestType: 'profile-change', entityId: null, policyGroupId: null },
  { id: 'ch-document', name: 'Document', requestType: 'document', entityId: null, policyGroupId: null },
];

/** 6.6 Approval steps. Thresholds invented. */
export const approvalSteps: ApprovalStep[] = [
  // Leave — office: manager, then skip-level beyond 5 days, then HR beyond 15.
  { id: 'st-lo-1', chainId: 'ch-leave-office', position: 1, approverRole: 'reporting-manager', condition: null, escalationDays: 3 },
  { id: 'st-lo-2', chainId: 'ch-leave-office', position: 2, approverRole: 'skip-level-manager', condition: { field: 'days', operator: 'gt', value: 5, describe: 'more than 5 days' }, escalationDays: 3 },
  { id: 'st-lo-3', chainId: 'ch-leave-office', position: 3, approverRole: 'hr', condition: { field: 'days', operator: 'gt', value: 15, describe: 'more than 15 days' }, escalationDays: 5 },

  // Leave — factory: supervisor, then department head beyond 3 days.
  { id: 'st-lf-1', chainId: 'ch-leave-factory', position: 1, approverRole: 'reporting-manager', condition: null, escalationDays: 2 },
  { id: 'st-lf-2', chainId: 'ch-leave-factory', position: 2, approverRole: 'department-head', condition: { field: 'days', operator: 'gt', value: 3, describe: 'more than 3 days' }, escalationDays: 2 },

  { id: 'st-ld-1', chainId: 'ch-leave-default', position: 1, approverRole: 'reporting-manager', condition: null, escalationDays: 3 },
  { id: 'st-ld-2', chainId: 'ch-leave-default', position: 2, approverRole: 'department-head', condition: { field: 'days', operator: 'gt', value: 7, describe: 'more than 7 days' }, escalationDays: 3 },

  { id: 'st-reg-1', chainId: 'ch-reg', position: 1, approverRole: 'reporting-manager', condition: null, escalationDays: 3 },
  { id: 'st-wfh-1', chainId: 'ch-wfh', position: 1, approverRole: 'reporting-manager', condition: null, escalationDays: 2 },
  { id: 'st-wfh-2', chainId: 'ch-wfh', position: 2, approverRole: 'department-head', condition: { field: 'days', operator: 'gt', value: 5, describe: 'more than 5 days' }, escalationDays: 3 },
  { id: 'st-od-1', chainId: 'ch-onduty', position: 1, approverRole: 'reporting-manager', condition: null, escalationDays: 2 },

  { id: 'st-ot-1', chainId: 'ch-overtime', position: 1, approverRole: 'reporting-manager', condition: null, escalationDays: 2 },
  { id: 'st-ot-2', chainId: 'ch-overtime', position: 2, approverRole: 'department-head', condition: { field: 'hours', operator: 'gt', value: 4, describe: 'more than 4 hours' }, escalationDays: 3 },

  { id: 'st-pd-1', chainId: 'ch-partial', position: 1, approverRole: 'reporting-manager', condition: null, escalationDays: 2 },

  { id: 'st-as-1', chainId: 'ch-asset', position: 1, approverRole: 'reporting-manager', condition: null, escalationDays: 3 },
  { id: 'st-as-2', chainId: 'ch-asset', position: 2, approverRole: 'hr', condition: null, escalationDays: 5 },

  // Expense — finance joins above the threshold.
  { id: 'st-ex-1', chainId: 'ch-expense', position: 1, approverRole: 'reporting-manager', condition: null, escalationDays: 3 },
  { id: 'st-ex-2', chainId: 'ch-expense', position: 2, approverRole: 'finance', condition: { field: 'amount', operator: 'gt', value: 25000, describe: 'above ₹25,000' }, escalationDays: 5 },
  { id: 'st-ex-3', chainId: 'ch-expense', position: 3, approverRole: 'entity-head', condition: { field: 'amount', operator: 'gt', value: 100000, describe: 'above ₹1,00,000' }, escalationDays: 5 },

  { id: 'st-pc-1', chainId: 'ch-profile', position: 1, approverRole: 'hr', condition: null, escalationDays: 5 },
  { id: 'st-doc-1', chainId: 'ch-document', position: 1, approverRole: 'hr', condition: null, escalationDays: 5 },
];

/** 6.7 Delegations. Invented, and dated around the pinned mock day. */
export const delegations: Delegation[] = [
  {
    id: 'del-1',
    fromEmployeeId: 'emp-002',
    toEmployeeId: 'emp-008',
    validFrom: '2026-09-08',
    validTo: '2026-09-19',
    reason: 'Ananya is on leave — Priya is covering design approvals.',
  },
  {
    id: 'del-2',
    fromEmployeeId: 'emp-007',
    toEmployeeId: 'emp-030',
    validFrom: '2026-09-14',
    validTo: '2026-09-21',
    reason: 'Karthik is at the Dubai site — Suresh is covering.',
  },
  {
    id: 'del-3',
    fromEmployeeId: 'emp-004',
    toEmployeeId: 'emp-022',
    validFrom: '2026-08-01',
    validTo: '2026-08-14',
    reason: 'Past delegation, kept so the trail shows who approved on whose behalf.',
  },
];
