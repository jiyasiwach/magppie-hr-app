# 15. Code Reference

Every module, its exports, and what they do. Signatures are the real contract — the
`src/data` ones must survive the Supabase swap unchanged.

---

## `src/lib/`

### `types.ts` — the data contract
`IsoDate` `IsoTimestamp` · `Employee` `EmploymentRecord` `Shift` `Punch` `AttendanceDay`
`LeaveType` `LeaveTransaction` `LeaveRequest` `Request` `RequestDecisionComment`
`EmployeeDocument` `Notification` `Policy` `PolicyAcknowledgement` `Holiday` `Asset`
`Announcement` `Post` `PostReaction` `PostComment` `Role`
plus the union types (`EmployeeStatus`, `AttendanceStatus`, `RequestType`, …).
**Change a shape here first.**

### `constants.ts`
`APP_NAME` (currently the literal `[APP_NAME]`) · `APP_BUILD_NOTE` · `ORGANISATION_NAME` ·
`APP_VERSION`.

### `clock.ts`
`MOCK_TODAY = '2026-09-09'` · `today()` · `now()` (fixed 14:20 IST). Goes away with mocks.

### `date.ts` — calendar maths on `YYYY-MM-DD` strings
`toDate` `toIso` `addDays` `dayOfWeek` `datesBetween` `startOfMonth` `endOfMonth`
`addMonths` `formatMonth` `formatDate` `formatDayName` `formatTime` `formatTimestamp`
`inclusiveDayCount` `formatHours`.
Deliberately string-based — an attendance day is a calendar day, not an instant.

### `auth.ts` — **the auth seam**
`CurrentUser` · `getCurrentUser()` · `mockPersonas` · `setActiveMockUserId()` ·
`getActiveMockUserId()` · `deriveRole()` · `roleLabels`.
All but `CurrentUser` and `getCurrentUser` are deleted when real auth lands.

### `permissions.ts`
`reportingLine(managerId)` · `directReports(managerId)` · `isSelf` · `managesEmployee` ·
`canViewPersonalData` · `canViewDirectoryEntry` · `canEditEmployeeFully` ·
`selfEditableFields` · `canEditOwnField` · `canViewDocument` · `canSeeApprovals` ·
`canActOnRequest` · `canSeeTeamCalendar` · `canSeeSettings` · `visibleEmployeeIds`.
**Mirror of the RLS policies — keep both in step.**

### `labels.ts`
`Tone` and every enum→label / enum→tone map: `attendanceStatusLabels|Marks|Tones`,
`employeeStatusLabels|Tones`, `employmentTypeLabels`, `requestTypeLabels`,
`requestStatusLabels|Tones`, `leaveStatusLabels|Tones`, `punchSourceLabels`,
`documentTypeLabels`, `documentVisibilityLabels`, `assetCategoryLabels`,
`assetStatusLabels|Tones`, `employeeFieldLabels`, `employeeFieldLabel()`.

### `home.ts`
`roleGreeting(user)`, and re-exports two label maps.

### `supabase/client.ts`, `supabase/server.ts`
`createClient()` for browser and server. Both throw a clear message when env vars are
missing. Anon key only — no service role anywhere.

---

## `src/hooks/`

### `useAsync(fn, deps) → { state, reload }`
`AsyncState<T>` = `loading | error | ready`. Two keys — see AI_MEMORY §5. **Do not
simplify.**

### `useTicker.ts`
`useNow(intervalMs = 1000) → number` — current time, refreshed on an interval, returned as
a value so nothing calls `Date.now()` during render (an ESLint purity rule catches that).
`formatElapsed(ms) → "2h 14m 09s"`.

---

## `src/data/` — the swap point

### `store.ts` (mock-only, delete after the swap)
`store` · `dataVersion()` · `subscribe()` · `commit()` · `reviewFlags` · `DataError` ·
`read(fn)` · `write(fn)`.
`reviewFlags` powers the Settings toggles that force failure / empty / slow states.

### `directory.ts`
`listEmployees(filters)` · `getEmployee(id)` · `findEmployeeSync(id)` ·
`getEmploymentHistory(employeeId)` · `getActivityTrail(employeeId)` ·
`getReportingTree(rootId)` · `getManagerChain(employeeId)` · `listTeam(user)` ·
`canOpenProfile()` · `editableByHr` · `updateEmployee(user, id, changes)` ·
`applyEmployeeChanges(employee, entries)`.

### `attendance.ts`
`workedHours(punches, upto)` · `getAttendanceMonth(employeeId, month)` ·
`getDayDetail(employeeId, date)` · `getTodayStatus(employeeId, at)` ·
`punch(employeeId, direction, at)` · `getMonthSummary(employeeId, month)` ·
`raiseRegularisation(input)` · `getTeamAttendanceForDate(ids, date)` ·
`getUpcomingHolidays(limit?)`.

### `leave.ts`
`getLeaveBalances(employeeId)` → includes the full `breakdown[]` with running totals ·
`leaveDays(request)` · `getLeaveTypes()` · `getLeaveRequests(employeeId)` ·
`submitLeaveRequest(input)` · `cancelLeaveRequest(id)` · `getTeamLeave(ids, start, end)` ·
`getUpcomingLeave(employeeId)`.

### `requests.ts`
`getApprovalQueue(user, filters)` · `getMyRequests(employeeId)` · `getPendingCount(user)` ·
`decideRequest(user, id, decision, comment)` · `commentOnRequest(...)` ·
`acknowledgeRequest(user, id)` · `submitAttendanceRequest(employeeId, type, payload)`.

### `documents.ts`
`getOrgDocuments()` · `getDocuments(user, employeeId, includeArchived)` ·
`archiveDocument(id)` · `restoreDocument(id)` · `uploadDocument(input)` ·
`getPolicies(employeeId)` · `acknowledgePolicy(policyId, employeeId)`.

### `workplace.ts`
`getAnnouncements()` · `canPostAnnouncement(user)` · `createAnnouncement(...)` ·
`getPosts()` · `createPost(...)` · `toggleReaction(...)` · `commentOnPost(...)` ·
`getAssets(employeeId)` · `requestAsset(...)` · `getCelebrations(days)` · `sendWish(...)`.

### `team.ts`
`currentWeek()` · `shiftFor(employee)` · `getShift(employeeId)` ·
`getAwayThisWeek(scopeIds)` · `getTeammates(user)` · `countsFor(rows)` ·
`applyTeamFilter(rows, filter)` · `getDepartments(user)` · `searchColleagues(query, limit)`.

### `home.ts`
`getHomeSummary(user)` — today, balances, waiting-on-me, own open items, unacknowledged
policies, upcoming leave, recent notifications.

### `notifications.ts`
`getNotifications(recipientId)` · `markNotificationRead(id)`.

---

## `src/components/ui/`

### `index.tsx`
**Layout** `Stack` `Row` `Grid` `PageHeader` `Card` `Metric`
**Action** `Button` `ButtonLink`
**States** `LoadingState` `EmptyState` `ErrorState` `NoAccessState` **`AsyncSection`**
**Data** `DataTable<T>` (+ `Column<T>`) · `FilterBar` (+ `SelectFilter`) · `StatusPill`
**Identity** `Avatar` `Person`
**Quantity** `Meter` `Dial`
**Disclosure** `Working`
**Text** `Muted` `Small` `Mono`

`AsyncSection` props: `state`, `reload`, `isEmpty`, `empty`, `children(data)`,
`loadingRows`, `allowed`, `deniedLabel`. Passing `allowed={false}` renders the
no-permission state — this is how rule 4.4 is satisfied everywhere.

### `icons.tsx`
~25 original icons + `navIcons` lookup and `NavIconName`. Original artwork only.

---

## `src/components/` — domain

| File | Purpose |
| --- | --- |
| `shell/AppShell.tsx` | Top bar, nav (desktop + mobile), `RoleSwitcher`, `InboxBadge` |
| `shell/CurrentUserProvider.tsx` | `useCurrentUser()`, `switchUser()` |
| `shell/ColleagueSearch.tsx` | Top-bar search, 2-char threshold, click-outside |
| `shell/ProfileDrawer.tsx` | Account drawer |
| `shell/nav.ts` | The five items as data |
| `home/TodayCard.tsx` | Shift, dial, timer, clock control, punch, working expander |
| `attendance/PunchControl.tsx` | Standalone punch card on `/attendance` |
| `attendance/MonthCalendar.tsx` | Month grid, status colours + mark letters, legend |
| `attendance/DayDetail.tsx` | Day detail + `RegularisationForm` |
| `attendance/TeamToday.tsx` | Team, one date |
| `leave/LeaveBalances.tsx` | Balance cards + full ledger expander |
| `leave/LeaveRequestForm.tsx` | Apply form |
| `leave/LeaveHistory.tsx` | History + cancel |
| `leave/TeamCalendar.tsx` | Person × day grid, clash list |
| `requests/ApprovalList.tsx` | `ApprovalList`, `RequestCard`, `RequestAction` |
| `requests/renderers.tsx` | **Registry keyed by request type** — add new types here only |
| `documents/DocumentsPanel.tsx` | Personal documents, upload, archive/restore |
| `documents/OrgDocuments.tsx` | Company-wide documents |
| `documents/PolicyList.tsx` | Read-gated acknowledgement |
| `assets/AssetsPanel.tsx` | Assigned assets + requests |
| `directory/ProfileEditor.tsx` | HR direct edit / self via request |

---

## `src/app/` — routes

`/` Home · `/inbox` · `/wall` · `/me` (`?tab=time|finances|documents|assets`) ·
`/me/id-card` · `/team` · `/directory` · `/directory/[id]` · `/directory/tree` ·
`/attendance` · `/leave` · `/leave/apply` · `/requests` · `/requests/new` · `/policies` ·
`/settings` · `/feedback` · `/about`

`layout.tsx` loads Inter, sets metadata from `APP_NAME`, mounts `AppShell`.
`globals.css` holds the palette and the reset.

---

## `src/mocks/` (delete after the swap)

`employees.ts` (40 people, + `departments`/`locations`/`designations`) ·
`employmentRecords.ts` · `calendar.ts` (holidays, shifts, `shiftIdForLocation`,
`weeklyOffDays`) · `leaveTypes.ts` · `documents.ts` · `policies.ts` · `notifications.ts` ·
`workplace.ts` (assets, announcements, posts) · `attendanceAndLeave.ts` (the generator) ·
`seed.ts` (`hashSeed`, `makeRng`, `pick`, `intBetween`) · `index.ts` (barrel).

---

## `supabase/migrations/`

| File | Contents |
| --- | --- |
| `0001_schema.sql` | Extensions, 16 enums, 22 tables, indexes, `set_updated_at()` triggers |
| `0002_rls.sql` | 5 helper functions, RLS enabled on every table, all policies |
| `0003_functions.sql` | `ist_date`, `refresh_attendance_day`, punch trigger, `clock_punch`, `leave_days`, `apply_for_leave`, `cancel_leave_request`, `raise_request`, `decide_request`, `acknowledge_policy`, `link_auth_user_to_employee` + auth trigger |
| `0004_reference_data.sql` | Leave types, shifts, holidays. **No people.** |
