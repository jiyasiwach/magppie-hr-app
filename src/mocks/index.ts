/**
 * The single source of mock data for the whole app.
 *
 * Screens never import from here directly — they go through `src/data`, which
 * is the layer a back-end developer replaces. See README.md.
 */
export { employees, departments, locations, designations } from './employees';
export { employmentRecords } from './employmentRecords';
export { leaveTypes } from './leaveTypes';
export { holidays, weeklyOffDays } from './calendar';
export { employeeDocuments } from './documents';
export { policies, policyAcknowledgements } from './policies';
export { notifications } from './notifications';
export {
  punches,
  attendanceDays,
  leaveRequests,
  leaveTransactions,
  requests,
  leaveRequestDays,
  ATTENDANCE_RANGE_START,
  ATTENDANCE_RANGE_END,
  LEAVE_YEAR_START,
} from './attendanceAndLeave';
