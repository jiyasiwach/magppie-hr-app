-- =============================================================================
-- Reference data
-- =============================================================================
-- Things the company defines, not people. Safe to run on a fresh project.
-- Employees are NOT seeded here: the forty in the front end are invented, and
-- putting real staff into this database is a decision with consequences that
-- belongs to HR, not to a migration.
-- =============================================================================

insert into leave_types (name, accrues, half_days_allowed, can_go_negative) values
  ('Casual Leave',        true,  true,  false),
  ('Sick Leave',          true,  true,  false),
  ('Earned Leave',        true,  false, false),
  ('Leave Without Pay',   false, true,  true),
  ('Maternity Leave',     false, false, false),
  ('Paternity Leave',     false, false, false)
on conflict (name) do nothing;

-- FLAGGED: placeholder timings. Real shift timings per location have never
-- been given, and "on time" on the team screen depends entirely on these.
insert into shifts (name, start_time, end_time, expected_hours, flexible) values
  ('General',    '09:30', '18:30', 9, true),
  ('Factory A',  '08:00', '17:00', 9, false),
  ('Factory B',  '14:00', '23:00', 9, false),
  ('Showroom',   '10:30', '19:30', 9, false),
  ('Site',       '08:30', '17:30', 9, true)
on conflict (name) do nothing;

insert into holidays (date, name, optional) values
  ('2026-01-26', 'Republic Day',         false),
  ('2026-03-04', 'Holi',                 false),
  ('2026-04-14', 'Ambedkar Jayanti',     true),
  ('2026-08-15', 'Independence Day',     false),
  ('2026-08-26', 'Ganesh Chaturthi',     true),
  ('2026-09-04', 'Onam',                 true),
  ('2026-10-02', 'Gandhi Jayanti',       false),
  ('2026-10-20', 'Dussehra',             false),
  ('2026-11-08', 'Diwali',               false),
  ('2026-11-09', 'Govardhan Puja',       true),
  ('2026-12-25', 'Christmas',            false)
on conflict (date, name) do nothing;
