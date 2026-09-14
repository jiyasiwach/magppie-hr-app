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

/**
 * Status colour, never brown. Brown is the app's furniture; these are the
 * signals people read at a glance, so they have to survive being scanned on a
 * phone in a factory or a showroom.
 */
export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'quiet';

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
  present: 'success',
  absent: 'danger',
  'half-day': 'warning',
  leave: 'info',
  holiday: 'quiet',
  'weekly-off': 'quiet',
  'pending-regularisation': 'warning',
};

export const employeeStatusLabels: Record<EmployeeStatus, string> = {
  active: 'Active',
  probation: 'On probation',
  notice: 'On notice',
  inactive: 'Inactive',
};

export const employeeStatusTones: Record<EmployeeStatus, Tone> = {
  active: 'success',
  probation: 'warning',
  notice: 'warning',
  inactive: 'quiet',
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
  wfh: 'Work from home',
  'on-duty': 'On duty',
  overtime: 'Overtime',
  'partial-day': 'Partial day',
  asset: 'Asset',
  expense: 'Expense',
  'hr-notice': 'From HR',
};

export const assetCategoryLabels: Record<string, string> = {
  laptop: 'Laptop',
  phone: 'Phone',
  vehicle: 'Vehicle',
  tool: 'Tool',
  access: 'Access',
  other: 'Other',
};

export const assetStatusLabels: Record<string, string> = {
  assigned: 'Assigned',
  returned: 'Returned',
  'in-repair': 'In repair',
  lost: 'Lost',
};

export const assetStatusTones: Record<string, Tone> = {
  assigned: 'success',
  returned: 'quiet',
  'in-repair': 'warning',
  lost: 'danger',
};

export const requestStatusLabels: Record<RequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const requestStatusTones: Record<RequestStatus, Tone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'quiet',
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

/** Human names for the Employee fields a profile-change request can carry. */
export const employeeFieldLabels: Record<string, string> = {
  fullName: 'Full name',
  employeeCode: 'Employee code',
  workEmail: 'Work email',
  personalPhone: 'Personal phone',
  photo: 'Photo',
  department: 'Department',
  designation: 'Designation',
  managerId: 'Manager',
  location: 'Location',
  joiningDate: 'Joining date',
  employmentType: 'Employment type',
  status: 'Status',
  probationEndDate: 'Probation end date',
};

export function employeeFieldLabel(field: unknown): string {
  return employeeFieldLabels[String(field)] ?? String(field);
}

// --- structural additions ---------------------------------------------------

export const approverRoleLabels: Record<string, string> = {
  'reporting-manager': 'Reporting manager',
  'skip-level-manager': 'Skip-level manager',
  'department-head': 'Department head',
  'entity-head': 'Entity head',
  hr: 'HR',
  finance: 'Finance',
};

export const timelineTypeLabels: Record<string, string> = {
  joined: 'Joined',
  'probation-confirmed': 'Probation ended',
  'role-change': 'Role change',
  'department-change': 'Department change',
  'manager-change': 'Manager change',
  'entity-transfer': 'Entity transfer',
  'policy-group-change': 'Working rules changed',
  'training-completed': 'Training completed',
  'assessment-passed': 'Assessment',
  appraisal: 'Appraisal',
  exit: 'Left the company',
};

export const timelineTypeTones: Record<string, Tone> = {
  joined: 'success',
  'probation-confirmed': 'success',
  'role-change': 'info',
  'department-change': 'info',
  'manager-change': 'info',
  'entity-transfer': 'warning',
  'policy-group-change': 'warning',
  'training-completed': 'neutral',
  'assessment-passed': 'neutral',
  appraisal: 'neutral',
  exit: 'danger',
};

// --- employee voice ---------------------------------------------------------

export const voiceCategoryLabels: Record<string, string> = {
  workplace: 'Workplace or facilities',
  'pay-leave-attendance': 'Pay, leave or attendance',
  'policy-process': 'Policy or process',
  'manager-team': 'Manager or team',
  harassment: 'Harassment or misconduct',
  suggestion: 'Suggestion or idea',
  other: 'Something else',
};

export const voiceStatusLabels: Record<string, string> = {
  submitted: 'Submitted',
  'in-review': 'In review',
  'action-being-taken': 'Action being taken',
  resolved: 'Resolved',
  'closed-without-action': 'Closed without action',
};

export const voiceStatusTones: Record<string, Tone> = {
  submitted: 'warning',
  'in-review': 'info',
  'action-being-taken': 'info',
  resolved: 'success',
  'closed-without-action': 'quiet',
};

/** Said to the person before they submit, so nothing is a surprise afterwards. */
export const voiceStatusMeaning: Record<string, string> = {
  submitted: 'Received, not yet looked at.',
  'in-review': 'Someone has opened it and is looking.',
  'action-being-taken': 'Something is being done about it.',
  resolved: 'Finished, with an explanation of the outcome.',
  'closed-without-action': 'Closed, with an honest reason why nothing was done.',
};
