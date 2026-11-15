-- Automatic charging of stage 2 and 3: remember each attempt so a charge is never repeated by accident,
-- and so a failed one can fall back to a pay link and a retry.
alter table public.invoice
  add column charge_attempts int not null default 0 check (charge_attempts between 0 and 10),
  add column charge_attempted_at timestamptz,
  add column charge_error text check (charge_error is null or length(charge_error) <= 200);
