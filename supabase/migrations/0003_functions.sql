-- =============================================================================
-- Business rules
-- =============================================================================
-- Anything that must be atomic, or that a client must not be trusted to do,
-- lives here as a SECURITY DEFINER function. Balances are debited, attendance
-- is recomputed and approvals are applied in one transaction, server-side.
--
-- TIMEZONE: an attendance day is a calendar day in India. The database is in
-- Singapore, so every date boundary is computed against 'Asia/Kolkata'
-- explicitly and never against the server's own idea of today.
-- =============================================================================

create or replace function ist_date(ts timestamptz)
returns date
language sql
immutable
as $$
  select (ts at time zone 'Asia/Kolkata')::date;
$$;

-- --- attendance is derived, never typed in ------------------------------------

create or replace function refresh_attendance_day(p_employee uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total    interval := interval '0';
  open_at  timestamptz := null;
  r        record;
  v_first  timestamptz := null;
  v_last   timestamptz := null;
  v_status attendance_status;
  v_hours  numeric(5,2);
  v_on_leave boolean;
  v_holiday  boolean;
begin
  for r in
    select direction, punched_at
    from punches
    where employee_id = p_employee and ist_date(punched_at) = p_date
    order by punched_at
  loop
    if v_first is null and r.direction = 'in' then
      v_first := r.punched_at;
    end if;
    if r.direction = 'in' then
      open_at := r.punched_at;
    else
      v_last := r.punched_at;
      if open_at is not null then
        total := total + (r.punched_at - open_at);
        open_at := null;
      end if;
    end if;
  end loop;

  v_hours := round(extract(epoch from total) / 3600.0, 2);

  select exists (
    select 1 from leave_requests
    where employee_id = p_employee
      and status = 'approved'
      and p_date between start_date and end_date
  ) into v_on_leave;

  select exists (select 1 from holidays where date = p_date and not optional) into v_holiday;

  if v_holiday then
    v_status := 'holiday';
  elsif v_on_leave then
    v_status := 'leave';
  elsif extract(dow from p_date) in (0, 6) then
    -- FLAGGED: Saturday and Sunday for everyone. The factory almost certainly
    -- differs, and no per-location week has been given.
    v_status := 'weekly-off';
  elsif v_first is null then
    v_status := 'absent';
  elsif v_last is null then
    -- Punched in, never out. Not absence — it needs fixing.
    v_status := 'pending-regularisation';
  elsif v_hours < 4 then
    v_status := 'half-day';
  else
    v_status := 'present';
  end if;

  insert into attendance_days (employee_id, date, status, first_in, last_out, total_hours)
  values (p_employee, p_date, v_status, v_first, v_last, v_hours)
  on conflict (employee_id, date) do update
    set status      = case when attendance_days.was_regularised
                           then attendance_days.status else excluded.status end,
        first_in    = excluded.first_in,
        last_out    = coalesce(excluded.last_out, attendance_days.last_out),
        total_hours = excluded.total_hours;
end;
$$;

create or replace function punches_refresh_day()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform refresh_attendance_day(new.employee_id, ist_date(new.punched_at));
  return new;
end;
$$;

create trigger punches_after_insert
  after insert on punches
  for each row execute function punches_refresh_day();

-- --- clocking ----------------------------------------------------------------

create or replace function clock_punch(p_direction punch_direction, p_source punch_source default 'web',
                                       p_location text default null)
returns punches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me  uuid := current_employee_id();
  v_row punches;
begin
  if v_me is null then
    raise exception 'No employee record is linked to this sign-in.';
  end if;

  insert into punches (employee_id, punched_at, direction, source, location)
  values (v_me, now(), p_direction, p_source, p_location)
  returning * into v_row;

  return v_row;
end;
$$;

-- --- leave -------------------------------------------------------------------

create or replace function leave_days(p_start date, p_end date, p_half_start boolean, p_half_end boolean)
returns numeric
language sql
immutable
as $$
  -- FLAGGED: holidays and weekly offs inside the range are still counted.
  -- Nobody has said whether they should be.
  select (p_end - p_start + 1)::numeric
       - case when p_half_start then 0.5 else 0 end
       - case when p_half_end then 0.5 else 0 end;
$$;

create or replace function apply_for_leave(p_leave_type uuid, p_start date, p_end date,
                                           p_half_start boolean, p_half_end boolean, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me       uuid := current_employee_id();
  v_manager  uuid;
  v_leave_id uuid;
  v_req_id   uuid;
  v_days     numeric;
begin
  if v_me is null then raise exception 'No employee record is linked to this sign-in.'; end if;
  if p_end < p_start then raise exception 'The end date is before the start date.'; end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'A reason is required.'; end if;

  select manager_id into v_manager from employees where id = v_me;
  v_days := leave_days(p_start, p_end, p_half_start, p_half_end);

  insert into leave_requests (employee_id, leave_type_id, start_date, end_date,
                              half_day_start, half_day_end, reason)
  values (v_me, p_leave_type, p_start, p_end, p_half_start, p_half_end, btrim(p_reason))
  returning id into v_leave_id;

  insert into requests (type, raised_by, current_approver, status, payload, leave_request_id)
  values ('leave', v_me, coalesce(v_manager, (select id from employees where role = 'hr_admin' limit 1)),
          'pending',
          jsonb_build_object('leaveTypeId', p_leave_type, 'startDate', p_start, 'endDate', p_end,
                             'days', v_days, 'halfDayStart', p_half_start, 'halfDayEnd', p_half_end,
                             'reason', btrim(p_reason)),
          v_leave_id)
  returning id into v_req_id;

  return v_req_id;
end;
$$;

create or replace function cancel_leave_request(p_leave_request uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := current_employee_id();
  v_owner uuid;
  v_status request_status;
begin
  select employee_id, status into v_owner, v_status from leave_requests where id = p_leave_request;
  if v_owner is null then raise exception 'No such leave request.'; end if;
  if v_owner <> v_me and not is_hr_admin() then
    raise exception 'You can only cancel your own leave.';
  end if;
  if v_status <> 'pending' then
    raise exception 'Only a pending request can be cancelled.';
  end if;

  update leave_requests set status = 'cancelled' where id = p_leave_request;
  update requests set status = 'cancelled', current_approver = null
   where leave_request_id = p_leave_request;
end;
$$;

-- --- raising the other request types -----------------------------------------

create or replace function raise_request(p_type request_type, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me      uuid := current_employee_id();
  v_manager uuid;
  v_req     uuid;
begin
  if v_me is null then raise exception 'No employee record is linked to this sign-in.'; end if;
  if p_type in ('leave', 'hr-notice') then
    raise exception 'Use the dedicated function for this request type.';
  end if;

  select manager_id into v_manager from employees where id = v_me;

  insert into requests (type, raised_by, current_approver, status, payload)
  values (p_type, v_me,
          case when p_type in ('asset', 'expense', 'profile-change', 'document')
               then (select id from employees where role = 'hr_admin' order by employee_code limit 1)
               else coalesce(v_manager, (select id from employees where role = 'hr_admin' order by employee_code limit 1))
          end,
          'pending', coalesce(p_payload, '{}'::jsonb))
  returning id into v_req;

  if p_type = 'regularisation' then
    update attendance_days
       set status = 'pending-regularisation'
     where employee_id = v_me and date = (p_payload ->> 'date')::date;
  end if;

  return v_req;
end;
$$;

-- --- deciding ----------------------------------------------------------------

create or replace function decide_request(p_request uuid, p_decision decision_kind, p_comment text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me    uuid := current_employee_id();
  r       requests;
  v_lr    leave_requests;
  v_days  numeric;
  v_date  date;
begin
  select * into r from requests where id = p_request;
  if r.id is null then raise exception 'No such request.'; end if;

  if p_decision <> 'commented' then
    if r.status <> 'pending' then
      raise exception 'That request has already been decided.';
    end if;
    if r.current_approver <> v_me and not is_hr_admin() then
      raise exception 'That request is not waiting on you.';
    end if;
    if p_decision = 'rejected' and coalesce(btrim(p_comment), '') = '' then
      raise exception 'A rejection needs a comment.';
    end if;
  end if;

  insert into request_decisions (request_id, decided_by, decision, comment)
  values (p_request, v_me, p_decision, coalesce(btrim(p_comment), ''));

  if p_decision = 'commented' then
    return;
  end if;

  update requests
     set status = (case p_decision when 'approved' then 'approved' else 'rejected' end)::request_status,
         current_approver = null
   where id = p_request;

  -- Side effects, applied in the same transaction as the decision.
  if r.type = 'leave' and r.leave_request_id is not null then
    update leave_requests
       set status = (case p_decision when 'approved' then 'approved' else 'rejected' end)::request_status
     where id = r.leave_request_id
    returning * into v_lr;

    if p_decision = 'approved' then
      v_days := leave_days(v_lr.start_date, v_lr.end_date, v_lr.half_day_start, v_lr.half_day_end);

      insert into leave_transactions (employee_id, leave_type_id, date, amount, direction,
                                      reason, source, leave_request_id)
      values (v_lr.employee_id, v_lr.leave_type_id, v_lr.start_date, v_days, 'debit',
              'Leave taken — ' || v_lr.reason, 'leave-request', v_lr.id);

      -- Days inside an approved range become leave days.
      for v_date in select generate_series(v_lr.start_date, v_lr.end_date, interval '1 day')::date loop
        perform refresh_attendance_day(v_lr.employee_id, v_date);
      end loop;
    end if;
  end if;

  if r.type = 'regularisation' and p_decision = 'approved' then
    update attendance_days
       set status = coalesce((r.payload ->> 'requestedStatus')::attendance_status, 'present'),
           last_out = coalesce((r.payload ->> 'requestedLastOut')::timestamptz, last_out),
           was_regularised = true
     where employee_id = r.raised_by
       and date = (r.payload ->> 'date')::date;
  end if;

  if r.type = 'profile-change' and p_decision = 'approved' then
    if (r.payload ->> 'field') = 'personalPhone' then
      update employee_private set personal_phone = r.payload ->> 'to'
       where employee_id = coalesce((r.payload ->> 'employeeId')::uuid, r.raised_by);
    end if;
  end if;
end;
$$;

create or replace function acknowledge_policy(p_policy uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_me uuid := current_employee_id();
begin
  if v_me is null then raise exception 'No employee record is linked to this sign-in.'; end if;
  insert into policy_acknowledgements (policy_id, employee_id)
  values (p_policy, v_me)
  on conflict (policy_id, employee_id) do nothing;
end;
$$;

grant execute on function clock_punch, apply_for_leave, cancel_leave_request, raise_request,
                          decide_request, acknowledge_policy, leave_days, ist_date
  to authenticated;

-- --- linking a Google sign-in to an employee record --------------------------
-- Nobody is created by signing in. If the work email does not already exist in
-- `employees`, the session simply has no employee record and the app says so.
-- That is deliberate: an HR directory is not self-service.

create or replace function link_auth_user_to_employee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update employees
     set auth_user_id = new.id
   where work_email = new.email
     and auth_user_id is null;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function link_auth_user_to_employee();
