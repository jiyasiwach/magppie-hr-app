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
  dateOfBirth: IsoDate;
  /** Exactly one at a time. A transfer is dated history on the employment record. */
  entityId: string;
  /** Which working rules apply to this person. */
  policyGroupId: string;
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
  /** Carried here so an entity transfer is dated history, not an overwrite. */
  entityId: string;
  policyGroupId: string;
  validFrom: IsoDate;
  /** null means "current" */
  validTo: IsoDate | null;
}

/** 13.3 Shift */
export interface Shift {
  id: string;
  name: string;
  startTime: string; // "09:30"
  endTime: string; // "18:30"
  expectedHours: number;
  flexible: boolean;
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

export type RequestType =
  | 'leave'
  | 'regularisation'
  | 'document'
  | 'profile-change'
  | 'wfh'
  | 'on-duty'
  | 'overtime'
  | 'partial-day'
  | 'asset'
  | 'expense'
  | 'hr-notice';
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

/** 13.10 Document. `employeeId` is null for an organisation-wide document. */
export interface EmployeeDocument {
  id: string;
  employeeId: string | null;
  type: DocumentType;
  fileName: string;
  uploadedBy: string;
  uploadedOn: IsoTimestamp;
  visibility: DocumentVisibility;
  /** Records are never deleted — they are archived. */
  archived: boolean;
  /** Only set on documents that require signing. See SigningState. */
  signing?: DocumentSigning;
}

export type SigningState = 'not-sent' | 'awaiting-signature' | 'signed' | 'declined' | 'expired';

/**
 * The signing record. Once `state` is 'signed' this is immutable — a signature
 * that can be edited afterwards is not a signature.
 */
export interface DocumentSigning {
  state: SigningState;
  sentOn: IsoTimestamp | null;
  signedOn: IsoTimestamp | null;
  signedBy: string | null;
  /** The provider's envelope/document id. Null until a provider is chosen. */
  signatureReference: string | null;
  /** Where it was signed from, as reported by the provider. */
  signedFrom: string | null;
  declinedReason: string | null;
  expiresOn: IsoDate | null;
}

/** 13.15 Notification */
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

/** 13.12 Holiday */
export interface Holiday {
  id: string;
  date: IsoDate;
  name: string;
  optional: boolean;
}

export type AssetCategory = 'laptop' | 'phone' | 'vehicle' | 'tool' | 'access' | 'other';
export type AssetStatus = 'assigned' | 'returned' | 'in-repair' | 'lost';

/** 13.11 Asset */
export interface Asset {
  id: string;
  employeeId: string;
  name: string;
  category: AssetCategory;
  serial: string;
  assignedOn: IsoDate;
  status: AssetStatus;
}

/** 13.13 Announcement */
export interface Announcement {
  id: string;
  authorId: string;
  title: string;
  body: string;
  postedOn: IsoTimestamp;
}

export type ReactionType = 'like' | 'celebrate' | 'support';

export interface PostReaction {
  type: ReactionType;
  employeeIds: string[];
}

export interface PostComment {
  id: string;
  authorId: string;
  body: string;
  postedOn: IsoTimestamp;
}

/** 13.14 Post */
export interface Post {
  id: string;
  authorId: string;
  body: string;
  /** No file storage in this pass — a caption stands in for the image. */
  image: string | null;
  postedOn: IsoTimestamp;
  reactions: PostReaction[];
  comments: PostComment[];
}

export type Role = 'employee' | 'manager' | 'hr-admin';

// ===========================================================================
// Structural additions
// ===========================================================================

/** 6.1 Entity — a legal company within the group. */
export interface Entity {
  id: string;
  legalName: string;
  shortName: string;
  registrationNumber: string;
  gstin: string;
  pan: string;
  registeredAddress: string;
  /** Which locations belong to this entity. */
  locations: string[];
  active: boolean;
}

/** Per leave type, inside a leave policy. Rules are data, never code. */
export interface LeavePolicyRule {
  leaveTypeId: string;
  accrualRate: number;
  accrualFrequency: 'monthly' | 'quarterly' | 'annually' | 'none';
  maxCarryForward: number;
  encashable: boolean;
  canGoNegative: boolean;
  maxNegativeDays: number;
}

/** 6.3 Leave policy */
export interface LeavePolicy {
  id: string;
  name: string;
  entityId: string;
  rules: LeavePolicyRule[];
}

/** 6.4 Attendance policy */
export interface AttendancePolicy {
  id: string;
  name: string;
  entityId: string;
  shiftId: string;
  graceMinutes: number;
  halfDayThresholdHours: number;
  fullDayThresholdHours: number;
  /** After this many late marks in a month, a deduction applies. */
  lateMarksBeforeDeduction: number;
  lateDeductionLeaveTypeId: string | null;
  lateDeductionDays: number;
}

/** Grouping for holidays, so calendars can differ by entity. */
export interface HolidayCalendar {
  id: string;
  name: string;
  entityId: string;
}

/** Which days of the week are off, and how Saturdays work. */
export interface WeekOffPattern {
  id: string;
  name: string;
  /** 0 = Sunday. Always off. */
  days: number[];
  /** e.g. [2, 4] = second and fourth Saturday off. Empty = none. */
  alternateSaturdays: number[];
}

/** 6.2 Policy group — the unit that actually carries working rules. */
export interface PolicyGroup {
  id: string;
  entityId: string;
  name: string;
  description: string;
  leavePolicyId: string;
  attendancePolicyId: string;
  holidayCalendarId: string;
  weekOffPatternId: string;
}

/** Approvers are named by role, so a chain survives people changing jobs. */
export type ApproverRole =
  | 'reporting-manager'
  | 'skip-level-manager'
  | 'department-head'
  | 'entity-head'
  | 'hr'
  | 'finance';

export type ConditionOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq';

/** A step applies only when this holds true of the request payload. */
export interface ApprovalStepCondition {
  field: string;
  operator: ConditionOperator;
  value: number | string;
  /** Plain-English rendering, so the chain viewer never has to guess. */
  describe: string;
}

/** 6.6 Approval step */
export interface ApprovalStep {
  id: string;
  chainId: string;
  position: number;
  approverRole: ApproverRole;
  condition: ApprovalStepCondition | null;
  /** Untouched for this many days notifies the next level. Never auto-approves. */
  escalationDays: number | null;
}

/** 6.5 Approval chain */
export interface ApprovalChain {
  id: string;
  name: string;
  requestType: RequestType;
  entityId: string | null;
  policyGroupId: string | null;
}

/** 6.7 Delegation — an approver's authority, handed over for a dated period. */
export interface Delegation {
  id: string;
  fromEmployeeId: string;
  toEmployeeId: string;
  validFrom: IsoDate;
  validTo: IsoDate;
  reason: string;
}

export type TimelineEntryType =
  | 'joined'
  | 'probation-confirmed'
  | 'role-change'
  | 'department-change'
  | 'manager-change'
  | 'entity-transfer'
  | 'policy-group-change'
  | 'training-completed'
  | 'assessment-passed'
  | 'appraisal'
  | 'exit';

/** 6.8 Timeline entry — generated from the record that caused it, never typed. */
export interface TimelineEntry {
  id: string;
  employeeId: string;
  date: IsoDate;
  type: TimelineEntryType;
  description: string;
  /** Which record produced this, so the entry can be traced back. */
  sourceRecordId: string | null;
  sourceModule: 'hr' | 'l&d';
  /** Job-related entries are the subset a manager may see. */
  jobRelated: boolean;
}

// ===========================================================================
// Employee Voice
// ===========================================================================

export type VoiceCategory =
  | 'workplace'
  | 'pay-leave-attendance'
  | 'policy-process'
  | 'manager-team'
  | 'harassment'
  | 'suggestion'
  | 'other';

export type VoiceStatus =
  | 'submitted'
  | 'in-review'
  | 'action-being-taken'
  | 'resolved'
  | 'closed-without-action';

/** 12.1 Ticket */
export interface VoiceTicket {
  id: string;
  referenceCode: string;
  category: VoiceCategory;
  anonymous: boolean;
  /**
   * NULL when anonymous, and never written. Hiding a name at the display layer
   * is not anonymity — anyone with database access would still see it.
   */
  raiserId: string | null;
  subject: string;
  body: string;
  attachmentName: string | null;
  status: VoiceStatus;
  assignedTo: string | null;
  /**
   * For anonymous tickets this is coarsened to the start of the day, so it
   * cannot be lined up against a single person's session.
   */
  createdOn: IsoTimestamp;
  firstResponseOn: IsoTimestamp | null;
  closedOn: IsoTimestamp | null;
  /** A ticket cannot reach resolved or closed without this. */
  closingNote: string | null;
  /** Shown alongside "action being taken". */
  statusNote: string | null;
}

/** 12.2 Ticket message */
export interface VoiceMessage {
  id: string;
  ticketId: string;
  authorType: 'raiser' | 'hr';
  /** Only when HR chooses to identify themselves. */
  authorId: string | null;
  body: string;
  createdOn: IsoTimestamp;
}

/** 12.3 Committee member — the POSH Internal Committee. */
export interface CommitteeMember {
  id: string;
  employeeId: string;
  validFrom: IsoDate;
  validTo: IsoDate | null;
}

/**
 * FLAGGED, not in the brief's shapes: section 3.2 requires that only specific
 * HR people see this module, not everyone holding an HR admin role elsewhere in
 * the app. That needs its own assignment record.
 */
export interface VoiceHandler {
  id: string;
  employeeId: string;
  validFrom: IsoDate;
  validTo: IsoDate | null;
}

// ===========================================================================
// Custom fields
// ===========================================================================

export type CustomFieldRecordType = 'employee' | 'request' | 'asset' | 'document';
export type CustomFieldType = 'text' | 'number' | 'date' | 'dropdown' | 'yesno' | 'file';

/** Who may read a custom field. Defaults to the narrowest. */
export type FieldAudience = 'hr-only' | 'manager' | 'employee';
/** Who may write it. */
export type FieldEditor = 'hr-only' | 'employee';

/** 7.1 Custom field */
export interface CustomField {
  id: string;
  recordType: CustomFieldRecordType;
  label: string;
  /** Stable key used in exports and report columns. Never changes. */
  key: string;
  fieldType: CustomFieldType;
  /** Only for dropdowns. Editable without touching the field itself. */
  options: string[];
  required: boolean;
  visibleTo: FieldAudience;
  editableBy: FieldEditor;
  displayOrder: number;
  /** Retired, never deleted — old records keep their values. */
  active: boolean;
  helpText: string | null;
}

/** 7.2 Custom field value */
export interface CustomFieldValue {
  id: string;
  fieldId: string;
  recordId: string;
  value: string;
}

// ===========================================================================
// Surveys
// ===========================================================================

export type SurveyStatus = 'draft' | 'open' | 'closed';
export type SurveyQuestionType = 'rating' | 'single-choice' | 'multi-choice' | 'free-text' | 'enps';

/** 7.4 Survey */
export interface Survey {
  id: string;
  title: string;
  description: string;
  /** Policy group ids, entity ids, or 'everyone'. */
  audience: string[];
  anonymous: boolean;
  opensOn: IsoDate;
  closesOn: IsoDate;
  status: SurveyStatus;
  createdBy: string;
}

/** 7.5 Survey question */
export interface SurveyQuestion {
  id: string;
  surveyId: string;
  type: SurveyQuestionType;
  text: string;
  options: string[];
  order: number;
  required: boolean;
}

/**
 * 7.6 Survey response. `respondentId` is NULL on an anonymous survey and is
 * never written — the same rule as the Employee Voice module.
 */
export interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentId: string | null;
  submittedOn: IsoTimestamp;
}

/**
 * Records THAT a person responded, without recording WHAT they said.
 *
 * Without this, an anonymous survey either allows unlimited resubmission or
 * has to link answers to people. This is the standard way out: participation
 * and answers live in separate tables with no key between them.
 *
 * FLAGGED: it does reveal that someone took part, which in a very small
 * audience is itself information. The five-respondent floor is what keeps that
 * from becoming identifying.
 */
export interface SurveyParticipation {
  id: string;
  surveyId: string;
  employeeId: string;
  respondedOn: IsoDate;
}

/** 7.7 Survey answer */
export interface SurveyAnswer {
  id: string;
  responseId: string;
  questionId: string;
  value: string;
}

// ===========================================================================
// HR assistant
// ===========================================================================

export type AssistantRole = 'person' | 'assistant';

export interface AssistantMessage {
  id: string;
  role: AssistantRole;
  body: string;
  /** Policy ids the answer was drawn from. Empty means it cited nothing. */
  citations: string[];
  createdOn: IsoTimestamp;
  /** True when the assistant declined and offered a handoff instead. */
  handoff: boolean;
  /** True when the answer read the asker's own records. Drives provenance. */
  usedRecords?: boolean;
}

/** 7.8 Assistant conversation */
export interface AssistantConversation {
  id: string;
  employeeId: string;
  startedOn: IsoTimestamp;
  messages: AssistantMessage[];
  endedInHandoff: boolean;
}

// ===========================================================================
// Saved reports
// ===========================================================================

export type ReportRecordType = 'employee' | 'attendance' | 'leave' | 'request' | 'asset';
export type FilterOperator = 'eq' | 'ne' | 'contains' | 'gt' | 'lt';

export interface ReportFilter {
  column: string;
  operator: FilterOperator;
  value: string;
}

/** 7.9 Saved report */
export interface SavedReport {
  id: string;
  name: string;
  recordType: ReportRecordType;
  /** Column keys, including `custom:<fieldKey>` for custom fields. */
  columns: string[];
  filters: ReportFilter[];
  groupBy: string | null;
  createdBy: string;
  /** Roles it is shared with. Visibility is still evaluated for the runner. */
  sharedWith: Role[];
  createdOn: IsoTimestamp;
}

// ===========================================================================
// Integrations
// ===========================================================================

export type IntegrationId = 'zoho-crm' | 'zoho-books' | 'lnd-portal' | 'email' | 'whatsapp';
export type IntegrationStatus = 'not-configured' | 'connected' | 'degraded' | 'unreachable';
export type IntegrationDirection = 'read' | 'write' | 'both';

export interface Integration {
  id: IntegrationId;
  name: string;
  purpose: string;
  direction: IntegrationDirection;
  status: IntegrationStatus;
  /** What the user is shown when the other system cannot be reached. */
  failureBehaviour: string;
  /** What must be agreed before this can be built. */
  openQuestions: string[];
}
