import type { LeaveType } from '@/lib/types';

export const leaveTypes: LeaveType[] = [
  { id: 'lt-casual', name: 'Casual Leave', accrues: true, halfDaysAllowed: true, canGoNegative: false },
  { id: 'lt-sick', name: 'Sick Leave', accrues: true, halfDaysAllowed: true, canGoNegative: false },
  { id: 'lt-earned', name: 'Earned Leave', accrues: true, halfDaysAllowed: false, canGoNegative: false },
  { id: 'lt-unpaid', name: 'Leave Without Pay', accrues: false, halfDaysAllowed: true, canGoNegative: true },
  { id: 'lt-maternity', name: 'Maternity Leave', accrues: false, halfDaysAllowed: false, canGoNegative: false },
  { id: 'lt-paternity', name: 'Paternity Leave', accrues: false, halfDaysAllowed: false, canGoNegative: false },
];
