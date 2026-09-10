-- =============================================================================
-- Magppie HR — core schema
-- =============================================================================
-- Design notes that matter later:
--
--  * Personal data is split out. `employees` carries what the directory shows
--    to any signed-in colleague; `employee_private` carries what only the
--    person, their management chain and HR may read. Row-level security is
--    row-level, so the only honest way to protect a column is to put it in a
--    table with its own policy.
--
--  * `role` is stored, not derived. The front end guessed it from department
--    and reports, which was flagged from the start. Row-level security cannot
--    rest on a guess made in the browser.
--
--  * Every table has RLS enabled in 0002. A table with RLS on and no policy
--    denies everything, which is the correct default for this dataset.
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- --- enums -------------------------------------------------------------------

create type app_role            as enum ('employee', 'manager', 'hr_admin');
create type employee_status     as enum ('active', 'probation', 'notice', 'inactive');
create type employment_type     as enum ('full-time', 'part-time', 'contract', 'intern');
create type punch_direction     as enum ('in', 'out');
create type punch_source        as enum ('web', 'mobile', 'biometric', 'manager-marked');
create type attendance_status   as enum ('present', 'absent', 'half-day', 'leave',
                                         'holiday', 'weekly-off', 'pending-regularisation');
create type leave_direction     as enum ('credit', 'debit', 'adjustment');
create type leave_source        as enum ('monthly-accrual', 'opening-balance', 'leave-request',
                                         'hr-adjustment', 'carry-forward', 'lapse');
create type request_status      as enum ('pending', 'approved', 'rejected', 'cancelled');
create type request_type        as enum ('leave', 'regularisation', 'document', 'profile-change',
                                         'wfh', 'on-duty', 'overtime', 'partial-day',
                                         'asset', 'expense', 'hr-notice');
create type decision_kind       as enum ('approved', 'rejected', 'commented');
create type document_type       as enum ('identity', 'education', 'employment', 'payroll',
                                         'policy', 'medical', 'other');
create type document_visibility as enum ('employee', 'manager', 'hr-only');
create type asset_category      as enum ('laptop', 'phone', 'vehicle', 'tool', 'access', 'other');
create type asset_status        as enum ('assigned', 'returned', 'in-repair', 'lost');
create type reaction_type       as enum ('like', 'celebrate', 'support');

-- --- helper: keep updated_at honest ------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --- people ------------------------------------------------------------------

create table employees (
  id               uuid primary key default gen_random_uuid(),
  -- Null until the person first signs in. Not every employee has an account.
  auth_user_id     uuid unique references auth.users (id) on delete set null,
  employee_code    text not null unique,
  full_name        text not null,
  work_email       citext not null unique,
  photo_url        text,
  department       text not null,
  designation      text not null,
  manager_id       uuid references employees (id) on delete set null,
  location         text not null,
  joining_date     date not null,
  employment_type  employment_type not null default 'full-time',
  status           employee_status not null default 'active',
  probation_end_date date,
  role             app_role not null default 'employee',
  -- "MM-DD" only. Birthdays are shown company-wide on Home; the birth *year*
  -- is personal data and lives in employee_private.
  birth_month_day  text check (birth_month_day ~ '^\d{2}-\d{2}$'),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint employees_not_own_manager check (manager_id is null or manager_id <> id)
);

create index employees_manager_idx    on employees (manager_id);
create index employees_department_idx on employees (department);
create index employees_status_idx     on employees (status);

create trigger employees_updated_at
  before update on employees
  for each row execute function set_updated_at();

-- Everything a colleague has no business reading.
create table employee_private (
  employee_id     uuid primary key references employees (id) on delete cascade,
  personal_phone  text,
  date_of_birth   date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger employee_private_updated_at
  before update on employee_private
  for each row execute function set_updated_at();

-- History, so that "who did this person report to in June" stays answerable.
create table employment_records (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references employees (id) on delete cascade,
  department   text not null,
  designation  text not null,
  manager_id   uuid references employees (id) on delete set null,
  valid_from   date not null,
  valid_to     date,
  created_at   timestamptz not null default now(),
  constraint employment_records_range check (valid_to is null or valid_to >= valid_from)
);

create index employment_records_employee_idx on employment_records (employee_id, valid_from desc);

-- --- time --------------------------------------------------------------------

create table shifts (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  start_time     time not null,
  end_time       time not null,
  expected_hours numeric(4, 2) not null,
  flexible       boolean not null default false
);

-- FLAGGED: rostering is its own module. This is the minimum that lets
-- "on time" mean something, and it is one shift per person until then.
create table employee_shifts (
  employee_id uuid primary key references employees (id) on delete cascade,
  shift_id    uuid not null references shifts (id),
  assigned_on date not null default current_date
);

create table holidays (
  id       uuid primary key default gen_random_uuid(),
  date     date not null,
  name     text not null,
  optional boolean not null default false,
  unique (date, name)
);

create table punches (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  punched_at  timestamptz not null,
  direction   punch_direction not null,
  source      punch_source not null default 'web',
  location    text,
  created_at  timestamptz not null default now()
);

create index punches_employee_time_idx on punches (employee_id, punched_at);

create table attendance_days (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references employees (id) on delete cascade,
  date            date not null,
  status          attendance_status not null,
  first_in        timestamptz,
  last_out        timestamptz,
  total_hours     numeric(5, 2) not null default 0,
  was_regularised boolean not null default false,
  updated_at      timestamptz not null default now(),
  unique (employee_id, date)
);

create index attendance_days_date_idx on attendance_days (date);

create trigger attendance_days_updated_at
  before update on attendance_days
  for each row execute function set_updated_at();

-- --- leave -------------------------------------------------------------------

create table leave_types (
  id                uuid primary key default gen_random_uuid(),
  name              text not null unique,
  accrues           boolean not null default false,
  half_days_allowed boolean not null default false,
  can_go_negative   boolean not null default false,
  active            boolean not null default true
);

create table leave_requests (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references employees (id) on delete cascade,
  leave_type_id  uuid not null references leave_types (id),
  start_date     date not null,
  end_date       date not null,
  half_day_start boolean not null default false,
  half_day_end   boolean not null default false,
  reason         text not null,
  status         request_status not null default 'pending',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint leave_requests_range check (end_date >= start_date)
);

create index leave_requests_employee_idx on leave_requests (employee_id, start_date desc);
create index leave_requests_window_idx   on leave_requests (start_date, end_date);

create trigger leave_requests_updated_at
  before update on leave_requests
  for each row execute function set_updated_at();

-- The ledger. A balance is never stored — it is the sum of these, which is
-- what lets every screen show its working.
create table leave_transactions (
  id               uuid primary key default gen_random_uuid(),
  employee_id      uuid not null references employees (id) on delete cascade,
  leave_type_id    uuid not null references leave_types (id),
  date             date not null,
  amount           numeric(5, 2) not null check (amount > 0),
  direction        leave_direction not null,
  reason           text not null,
  source           leave_source not null,
  leave_request_id uuid references leave_requests (id) on delete set null,
  created_at       timestamptz not null default now()
);

create index leave_transactions_employee_idx on leave_transactions (employee_id, leave_type_id, date);

-- --- requests: the generic approval object -----------------------------------

create table requests (
  id               uuid primary key default gen_random_uuid(),
  type             request_type not null,
  raised_by        uuid not null references employees (id) on delete cascade,
  raised_on        timestamptz not null default now(),
  current_approver uuid references employees (id) on delete set null,
  status           request_status not null default 'pending',
  payload          jsonb not null default '{}'::jsonb,
  -- Set for the request types that own a row elsewhere.
  leave_request_id uuid references leave_requests (id) on delete cascade,
  updated_at       timestamptz not null default now()
);

create index requests_approver_idx on requests (current_approver, status);
create index requests_raised_by_idx on requests (raised_by, raised_on desc);

create trigger requests_updated_at
  before update on requests
  for each row execute function set_updated_at();

create table request_decisions (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests (id) on delete cascade,
  decided_by uuid not null references employees (id) on delete cascade,
  decided_on timestamptz not null default now(),
  decision   decision_kind not null,
  comment    text not null default ''
);

create index request_decisions_request_idx on request_decisions (request_id, decided_on);

-- --- documents, policies, assets ---------------------------------------------

create table documents (
  id          uuid primary key default gen_random_uuid(),
  -- Null means the document belongs to the company, not a person.
  employee_id uuid references employees (id) on delete cascade,
  type        document_type not null,
  file_name   text not null,
  storage_path text,
  uploaded_by uuid not null references employees (id) on delete set null,
  uploaded_on timestamptz not null default now(),
  visibility  document_visibility not null default 'employee',
  archived    boolean not null default false
);

create index documents_employee_idx on documents (employee_id, type);

create table policies (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  version      text not null,
  published_on date not null,
  summary      text not null,
  body         text[] not null default '{}',
  active       boolean not null default true,
  unique (title, version)
);

create table policy_acknowledgements (
  id              uuid primary key default gen_random_uuid(),
  policy_id       uuid not null references policies (id) on delete cascade,
  employee_id     uuid not null references employees (id) on delete cascade,
  acknowledged_on timestamptz not null default now(),
  unique (policy_id, employee_id)
);

create table assets (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid references employees (id) on delete set null,
  name        text not null,
  category    asset_category not null default 'other',
  serial      text,
  assigned_on date not null default current_date,
  status      asset_status not null default 'assigned',
  updated_at  timestamptz not null default now()
);

create index assets_employee_idx on assets (employee_id);

create trigger assets_updated_at
  before update on assets
  for each row execute function set_updated_at();

-- --- announcements, wall, notifications --------------------------------------

create table announcements (
  id        uuid primary key default gen_random_uuid(),
  author_id uuid not null references employees (id) on delete cascade,
  title     text not null,
  body      text not null,
  posted_on timestamptz not null default now(),
  archived  boolean not null default false
);

create index announcements_posted_idx on announcements (posted_on desc);

create table posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references employees (id) on delete cascade,
  body          text not null,
  image_path    text,
  image_caption text,
  posted_on     timestamptz not null default now(),
  archived      boolean not null default false
);

create index posts_posted_idx on posts (posted_on desc);

-- Reactions and comments are their own rows rather than JSON on the post:
-- two people reacting at once must not overwrite each other.
create table post_reactions (
  post_id     uuid not null references posts (id) on delete cascade,
  employee_id uuid not null references employees (id) on delete cascade,
  type        reaction_type not null,
  created_at  timestamptz not null default now(),
  primary key (post_id, employee_id, type)
);

create table post_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references posts (id) on delete cascade,
  author_id   uuid not null references employees (id) on delete cascade,
  body        text not null,
  posted_on   timestamptz not null default now(),
  archived    boolean not null default false
);

create index post_comments_post_idx on post_comments (post_id, posted_on);

create table notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references employees (id) on delete cascade,
  title        text not null,
  body         text not null,
  created_on   timestamptz not null default now(),
  read         boolean not null default false
);

create index notifications_recipient_idx on notifications (recipient_id, created_on desc);
