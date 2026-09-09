import type {
  AttendanceStatus,
  DocumentType,
  DocumentVisibility,
  EmployeeStatus,
  EmploymentType,
  LeaveRequestStatus,
  PunchSource,
  RequestStatus,
  RequestType,
} from './types';

export type Tone = 'default' | 'strong' | 'muted' | 'dashed';

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  'half-day': 'Half day',
  leave: 'Leave',
  holiday: 'Holiday',
  'weekly-off': 'Weekly off',
  'pending-regularisation': 'Pending regularisation',
};

/** Single-letter marks for the month calendar. */
export const attendanceStatusMarks: Record<AttendanceStatus, string> = {
  present: 'P',
  absent: 'A',
  'half-day': '½',
  leave: 'L',
  holiday: 'H',
  'weekly-off': 'W',
  'pending-regularisation': '?',
};

export const attendanceStatusTones: Record<AttendanceStatus, Tone> = {
  present: 'default',
  absent: 'strong',
  'half-day': 'default',
  leave: 'muted',
  holiday: 'muted',
  'weekly-off': 'muted',
  'pending-regularisation': 'dashed',
};

export const employeeStatusLabels: Record<EmployeeStatus, string> = {
  active: 'Active',
  probation: 'On probation',
  notice: 'On notice',
  inactive: 'Inactive',
};

export const employeeStatusTones: Record<EmployeeStatus, Tone> = {
  active: 'default',
  probation: 'dashed',
  notice: 'dashed',
  inactive: 'muted',
};

export const employmentTypeLabels: Record<EmploymentType, string> = {
  'full-time': 'Full time',
  'part-time': 'Part time',
  contract: 'Contract',
  intern: 'Intern',
};

export const requestTypeLabels: Record<RequestType, string> = {
  leave: 'Leave',
  regularisation: 'Regularisation',
  document: 'Document',
  'profile-change': 'Profile change',
};

export const requestStatusLabels: Record<RequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const requestStatusTones: Record<RequestStatus, Tone> = {
  pending: 'dashed',
  approved: 'default',
  rejected: 'strong',
  cancelled: 'muted',
};

export const leaveStatusLabels: Record<LeaveRequestStatus, string> = requestStatusLabels;
export const leaveStatusTones: Record<LeaveRequestStatus, Tone> = requestStatusTones;

export const punchSourceLabels: Record<PunchSource, string> = {
  web: 'Web',
  mobile: 'Mobile',
  biometric: 'Biometric',
  'manager-marked': 'Marked by manager',
};

export const documentTypeLabels: Record<DocumentType, string> = {
  identity: 'Identity',
  education: 'Education',
  employment: 'Employment',
  payroll: 'Payroll',
  policy: 'Policy',
  medical: 'Medical',
  other: 'Other',
};

export const documentVisibilityLabels: Record<DocumentVisibility, string> = {
  employee: 'Visible to the employee',
  manager: 'Visible to the employee and their manager',
  'hr-only': 'HR only',
};
