-- =============================================================================
-- Row-level security
-- =============================================================================
-- Every table below has RLS enabled. A table with RLS on and no matching policy
-- denies the request, so anything not granted here is refused by default.
--
-- The helpers are SECURITY DEFINER on purpose: they read `employees` to work
-- out who you are and who you manage, and they must not be filtered by the very
-- policies they exist to evaluate. search_path is pinned on each one so a
-- caller cannot shadow a table name and change what they mean.
-- =============================================================================

-- --- who am I ----------------------------------------------------------------

create or replace function current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from employees where auth_user_id = auth.uid();
$$;

create or replace function current_app_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from employees where auth_user_id = auth.uid();
$$;

create or replace function is_hr_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'hr_admin' from employees where auth_user_id = auth.uid()), false);
$$;

-- Everyone below the current user in the reporting tree, at any depth.
create or replace function manages(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with recursive me as (
    select id from employees where auth_user_id = auth.uid()
  ),
  down as (
    select e.id from employees e join me on e.manager_id = me.id
    union all
    select e.id from employees e join down d on e.manager_id = d.id
  )
  select exists (select 1 from down where id = target);
$$;

-- The rule the whole app leans on: you, your reporting line, or HR.
create or replace function can_see_person(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target = current_employee_id() or is_hr_admin() or manages(target);
$$;

grant execute on function current_employee_id, current_app_role, is_hr_admin, manages, can_see_person
  to authenticated;

-- --- enable RLS everywhere ---------------------------------------------------

alter table employees              enable row level security;
alter table employee_private       enable row level security;
alter table employment_records     enable row level security;
alter table shifts                 enable row level security;
alter table employee_shifts        enable row level security;
alter table holidays               enable row level security;
alter table punches                enable row level security;
alter table attendance_days        enable row level security;
alter table leave_types            enable row level security;
alter table leave_requests         enable row level security;
alter table leave_transactions     enable row level security;
alter table requests               enable row level security;
alter table request_decisions      enable row level security;
alter table documents              enable row level security;
alter table policies               enable row level security;
alter table policy_acknowledgements enable row level security;
alter table assets                 enable row level security;
alter table announcements          enable row level security;
alter table posts                  enable row level security;
alter table post_reactions         enable row level security;
alter table post_comments          enable row level security;
alter table notifications          enable row level security;

-- --- people ------------------------------------------------------------------

-- The directory is company-wide by design: name, role, department, who reports
-- to whom. Nothing personal lives on this table.
create policy employees_read on employees
  for select to authenticated
  using (true);

create policy employees_hr_write on employees
  for all to authenticated
  using (is_hr_admin())
  with check (is_hr_admin());

-- Phone number and date of birth. Not company-wide.
create policy employee_private_read on employee_private
  for select to authenticated
  using (can_see_person(employee_id));

-- Deliberately HR-only for writes. A person changing their own number raises a
-- profile-change request, which is how the front end already works, so there is
-- an approval trail rather than a silent edit.
create policy employee_private_hr_write on employee_private
  for all to authenticated
  using (is_hr_admin())
  with check (is_hr_admin());

create policy employment_records_read on employment_records
  for select to authenticated
  using (can_see_person(employee_id));

create policy employment_records_hr_write on employment_records
  for all to authenticated
  using (is_hr_admin())
  with check (is_hr_admin());

-- --- reference data ----------------------------------------------------------

create policy shifts_read on shifts for select to authenticated using (true);
create policy shifts_hr_write on shifts for all to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

-- FLAGGED: this lets any colleague see which shift someone is on. The team
-- filter chips need it. Nobody has confirmed it is the intended rule.
create policy employee_shifts_read on employee_shifts for select to authenticated using (true);
create policy employee_shifts_hr_write on employee_shifts for all to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

create policy holidays_read on holidays for select to authenticated using (true);
create policy holidays_hr_write on holidays for all to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

create policy leave_types_read on leave_types for select to authenticated using (true);
create policy leave_types_hr_write on leave_types for all to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

create policy policies_read on policies for select to authenticated using (true);
create policy policies_hr_write on policies for all to authenticated
  using (is_hr_admin()) with check (is_hr_admin());

-- --- attendance --------------------------------------------------------------

create policy punches_read on punches
  for select to authenticated
  using (can_see_person(employee_id));

-- You may record your own punch. A manager or HR may mark one for someone in
-- their line, and it must be labelled as manager-marked rather than passing
-- itself off as a biometric read.
create policy punches_insert_self on punches
  for insert to authenticated
  with check (employee_id = current_employee_id());

create policy punches_insert_marked on punches
  for insert to authenticated
  with check (
    source = 'manager-marked'
    and (is_hr_admin() or manages(employee_id))
  );

-- No update, no delete, by anyone. Punches are the evidence. A wrong day is
-- corrected by a regularisation request, which leaves a trail.

create policy attendance_days_read on attendance_days
  for select to authenticated
  using (can_see_person(employee_id));

-- Derived from punches by trigger. Nobody writes it from a client.

-- --- leave -------------------------------------------------------------------

create policy leave_requests_read on leave_requests
  for select to authenticated
  using (can_see_person(employee_id));

create policy leave_transactions_read on leave_transactions
  for select to authenticated
  using (can_see_person(employee_id));

-- Balances move only through the RPCs in 0003. A client cannot credit itself.

-- --- requests ----------------------------------------------------------------

-- You see what you raised, what is waiting on you, and anything from your line.
create policy requests_read on requests
  for select to authenticated
  using (
    raised_by = current_employee_id()
    or current_approver = current_employee_id()
    or is_hr_admin()
    or manages(raised_by)
  );

create policy request_decisions_read on request_decisions
  for select to authenticated
  using (
    exists (
      select 1 from requests r
      where r.id = request_decisions.request_id
        and (
          r.raised_by = current_employee_id()
          or r.current_approver = current_employee_id()
          or is_hr_admin()
          or manages(r.raised_by)
        )
    )
  );

-- --- documents and assets ----------------------------------------------------

create policy documents_read on documents
  for select to authenticated
  using (
    -- Company-wide documents belong to nobody and are readable by everyone.
    employee_id is null
    or is_hr_admin()
    or (employee_id = current_employee_id() and visibility <> 'hr-only')
    or (visibility = 'manager' and manages(employee_id))
  );

create policy documents_hr_write on documents
  for all to authenticated
  using (is_hr_admin())
  with check (is_hr_admin());

create policy documents_insert_own on documents
  for insert to authenticated
  with check (employee_id = current_employee_id() and visibility <> 'hr-only');

create policy policy_ack_read on policy_acknowledgements
  for select to authenticated
  using (can_see_person(employee_id));

create policy policy_ack_insert_self on policy_acknowledgements
  for insert to authenticated
  with check (employee_id = current_employee_id());

create policy assets_read on assets
  for select to authenticated
  using (employee_id is null or can_see_person(employee_id));

create policy assets_hr_write on assets
  for all to authenticated
  using (is_hr_admin())
  with check (is_hr_admin());

-- --- announcements, wall, notifications --------------------------------------

create policy announcements_read on announcements
  for select to authenticated
  using (not archived or is_hr_admin());

-- FLAGGED: HR only, as the narrowest reading. Nobody has said who may post.
create policy announcements_hr_write on announcements
  for all to authenticated
  using (is_hr_admin())
  with check (is_hr_admin());

create policy posts_read on posts
  for select to authenticated
  using (not archived or is_hr_admin());

create policy posts_insert_own on posts
  for insert to authenticated
  with check (author_id = current_employee_id());

-- You may archive your own post. Nothing is deleted, here or anywhere.
create policy posts_archive_own on posts
  for update to authenticated
  using (author_id = current_employee_id() or is_hr_admin())
  with check (author_id = current_employee_id() or is_hr_admin());

create policy post_reactions_read on post_reactions for select to authenticated using (true);

create policy post_reactions_own on post_reactions
  for all to authenticated
  using (employee_id = current_employee_id())
  with check (employee_id = current_employee_id());

create policy post_comments_read on post_comments
  for select to authenticated
  using (not archived or is_hr_admin());

create policy post_comments_insert_own on post_comments
  for insert to authenticated
  with check (author_id = current_employee_id());

create policy post_comments_archive_own on post_comments
  for update to authenticated
  using (author_id = current_employee_id() or is_hr_admin())
  with check (author_id = current_employee_id() or is_hr_admin());

create policy notifications_read_own on notifications
  for select to authenticated
  using (recipient_id = current_employee_id());

create policy notifications_mark_read on notifications
  for update to authenticated
  using (recipient_id = current_employee_id())
  with check (recipient_id = current_employee_id());
