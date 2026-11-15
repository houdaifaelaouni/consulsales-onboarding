-- Admin billing controls. Only an admin can use them, and each one is written to the audit log.
-- 1. Custom price per stage (a discount is just a lower price). Null = the plan price.
-- 2. Waive a stage: it counts as paid (so work can start) but no money is taken.
-- 3. Free trial: the client may enter the workspace before paying stage 1, until a date. Nothing is delivered until stage 1 is paid or waived.

alter table public.workspace
  add column stage_price_cents int[] check (stage_price_cents is null or cardinality(stage_price_cents) = 3),
  add column trial_until timestamptz;
alter table public.invoice add column waived boolean not null default false;

-- A charge we asked for and have no answer to yet: never change or waive the stage under it.
create function public.billing_charge_in_flight(p_ws uuid, p_stage int) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.invoice where workspace_id = p_ws and stage = p_stage and paid_at is null
                 and charge_attempted_at is not null and charge_error is null)
$$;

create function public.admin_set_stage_price(p_ws uuid, p_stage int, p_cents int) returns void
language plpgsql security definer set search_path = public as $$
declare cur int[];
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_stage not between 1 and 3 then raise exception 'bad stage' using errcode = '22023'; end if;
  if p_cents is not null and p_cents not between 100 and 10000000 then raise exception 'price must be between 1 and 100000' using errcode = '22023'; end if;
  select stage_price_cents into cur from public.workspace where id = p_ws for update;
  if not found then raise exception 'not found' using errcode = '42501'; end if;
  if exists (select 1 from public.invoice where workspace_id = p_ws and stage = p_stage and paid_at is not null) then
    raise exception 'stage already paid' using errcode = '23514';
  end if;
  if public.billing_charge_in_flight(p_ws, p_stage) then raise exception 'a charge is in progress' using errcode = '23514'; end if;

  cur := coalesce(cur, array[null, null, null]::int[]);
  cur[p_stage] := p_cents;
  update public.workspace set stage_price_cents = case when cur = array[null, null, null]::int[] then null else cur end where id = p_ws;
  -- An unpaid invoice gets a fresh price and payment link on the next visit or charge.
  update public.invoice set amount_cents = null, pay_url = null, provider_invoice_id = null,
    charge_attempts = 0, charge_attempted_at = null, charge_error = null
  where workspace_id = p_ws and stage = p_stage and paid_at is null;
  insert into public.event_log (workspace_id, actor, action, detail)
    values (p_ws, auth.uid(), 'billing.price_set', jsonb_build_object('stage', p_stage, 'cents', p_cents));
end $$;

create function public.admin_waive_stage(p_ws uuid, p_stage int, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_stage not between 1 and 3 then raise exception 'bad stage' using errcode = '22023'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then raise exception 'a reason is required' using errcode = '22023'; end if;
  perform 1 from public.workspace where id = p_ws for update;
  if not found then raise exception 'not found' using errcode = '42501'; end if;
  if public.billing_charge_in_flight(p_ws, p_stage) then raise exception 'a charge is in progress' using errcode = '23514'; end if;
  insert into public.invoice (workspace_id, stage, paid_at, waived, amount_cents)
    values (p_ws, p_stage, now(), true, 0)
  on conflict (workspace_id, stage) do update
    set paid_at = now(), waived = true, amount_cents = 0, pay_url = null, provider_invoice_id = null, charge_error = null
    where public.invoice.paid_at is null;
  if not found then raise exception 'stage already paid' using errcode = '23514'; end if;
  insert into public.event_log (workspace_id, actor, action, detail)
    values (p_ws, auth.uid(), 'billing.stage_waived', jsonb_build_object('stage', p_stage, 'reason', left(trim(p_reason), 200)));
end $$;

create function public.admin_set_trial(p_ws uuid, p_until timestamptz) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_until is not null and (p_until <= now() or p_until > now() + interval '90 days') then
    raise exception 'a trial ends within the next 90 days' using errcode = '22023';
  end if;
  update public.workspace set trial_until = p_until where id = p_ws;
  if not found then raise exception 'not found' using errcode = '42501'; end if;
  insert into public.event_log (workspace_id, actor, action, detail)
    values (p_ws, auth.uid(), 'billing.trial_set', jsonb_build_object('until', p_until));
end $$;

revoke all on function public.billing_charge_in_flight(uuid, int), public.admin_set_stage_price(uuid, int, int),
  public.admin_waive_stage(uuid, int, text), public.admin_set_trial(uuid, timestamptz) from public, anon;
grant execute on function public.admin_set_stage_price(uuid, int, int), public.admin_waive_stage(uuid, int, text),
  public.admin_set_trial(uuid, timestamptz) to authenticated;
