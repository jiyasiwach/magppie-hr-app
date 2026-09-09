/**
 * Data shapes for the Magppie HR app.
 *
 * These are the contract. They are defined once, here, and are the same shapes
 * the back end will have to return. Screens must not invent extra fields or
 * reshape these at the component level.
 */

/** ISO date, no time component. e.g. "2026-09-09" */
export type IsoDate = string;
/** ISO timestamp. e.g. "2026-09-09T09:14:00+05:30" */
export type IsoTimestamp = string;

export type EmployeeStatus = 'active' | 'probation' | 'notice' | 'inactive';
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'intern';

/** 9.1 Employee */
export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  workEmail: string;
  personalPhone: string;
  photo: string | null;
  department: string;
  designation: string;
  managerId: string | null;
  location: string;
  joiningDate: IsoDate;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  probationEndDate: IsoDate | null;
}

/**
 * 9.2 Employment record — the history of a person's department/designation/manager.
 * Deliberately separate from Employee so historical views stay correct.
 */
export interface EmploymentRecord {
  id: string;
  employeeId: string;
  department: string;
  designation: string;
  managerId: string | null;
  validFrom: IsoDate;
  /** null means "current" */
  validTo: IsoDate | null;
}

export type PunchDirection = 'in' | 'out';
export type PunchSource = 'web' | 'mobile' | 'biometric' | 'manager-marked';

/** 9.3 Punch */
export interface Punch {
  id: string;
  employeeId: string;
  timestamp: IsoTimestamp;
  direction: PunchDirection;
  source: PunchSource;
  location: string | null;
}

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'half-day'
  | 'leave'
  | 'holiday'
  | 'weekly-off'
  | 'pending-regularisation';

/** 9.4 Attendance day */
export interface AttendanceDay {
  id: string;
  employeeId: string;
  date: IsoDate;
  status: AttendanceStatus;
  firstIn: IsoTimestamp | null;
  lastOut: IsoTimestamp | null;
  totalHours: number;
  wasRegularised: boolean;
}

/** 9.5 Leave type */
export interface LeaveType {
  id: string;
  name: string;
  accrues: boolean;
  halfDaysAllowed: boolean;
  canGoNegative: boolean;
}

export type LeaveTransactionDirection = 'credit' | 'debit' | 'adjustment';
export type LeaveTransactionSource =
  | 'monthly-accrual'
  | 'opening-balance'
  | 'leave-request'
  | 'hr-adjustment'
  | 'carry-forward'
  | 'lapse';

/** 9.6 Leave transaction — every movement that makes up a balance. */
export interface LeaveTransaction {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  date: IsoDate;
  /** Always positive. `direction` says which way it moves the balance. */
  amount: number;
  direction: LeaveTransactionDirection;
  reason: string;
  source: LeaveTransactionSource;
}

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/** 9.7 Leave request */
export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: IsoDate;
  endDate: IsoDate;
  halfDayStart: boolean;
  halfDayEnd: boolean;
  reason: string;
  status: LeaveRequestStatus;
}

export type RequestType = 'leave' | 'regularisation' | 'document' | 'profile-change';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/**
 * 9.8 Request — the generic approval object.
 * Every module that needs approval raises one of these. The approvals queue
 * renders `type` + `payload` and knows nothing else about the module.
 */
export interface Request {
  id: string;
  type: RequestType;
  raisedBy: string;
  raisedOn: IsoTimestamp;
  currentApprover: string | null;
  status: RequestStatus;
  payload: Record<string, unknown>;
  decisionComments: RequestDecisionComment[];
}

export interface RequestDecisionComment {
  by: string;
  on: IsoTimestamp;
  comment: string;
  decision: 'approved' | 'rejected' | 'commented';
}

export type DocumentType =
  | 'identity'
  | 'education'
  | 'employment'
  | 'payroll'
  | 'policy'
  | 'medical'
  | 'other';
export type DocumentVisibility = 'employee' | 'manager' | 'hr-only';

/** 9.9 Document */
export interface EmployeeDocument {
  id: string;
  employeeId: string;
  type: DocumentType;
  fileName: string;
  uploadedBy: string;
  uploadedOn: IsoTimestamp;
  visibility: DocumentVisibility;
  /** Records are never deleted — they are archived. */
  archived: boolean;
}

/** 9.10 Notification */
export interface Notification {
  id: string;
  recipientId: string;
  title: string;
  body: string;
  createdOn: IsoTimestamp;
  read: boolean;
}

/**
 * Not in section 9 — needed by 7.5 (policy acknowledgements).
 * Flagged in the report as an addition.
 */
export interface Policy {
  id: string;
  title: string;
  version: string;
  publishedOn: IsoDate;
  summary: string;
  /** Paragraphs. There is something to read before acknowledging. */
  body: string[];
}

export interface PolicyAcknowledgement {
  id: string;
  policyId: string;
  employeeId: string;
  acknowledgedOn: IsoTimestamp;
}

export interface Holiday {
  date: IsoDate;
  name: string;
}

export type Role = 'employee' | 'manager' | 'hr-admin';
