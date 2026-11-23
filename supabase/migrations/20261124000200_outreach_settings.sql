-- Outreach settings per workspace. The client controls them, but inside hard limits that the table itself enforces,
-- so no screen, job or API call can go past them: at most 30 invitations and 50 messages a day, working hours only
-- between 06:00 and 22:00. A new workspace starts paused; sending also stops while an admin has stopped it.

create table public.outreach_settings (
  workspace_id uuid primary key references public.workspace (id) on delete cascade,
  invites_per_day int not null default 15 check (invites_per_day between 0 and 30),
  messages_per_day int not null default 30 check (messages_per_day between 0 and 50),
  work_start time not null default '08:00',
  work_end time not null default '18:00',
  timezone text not null default 'Europe/Madrid',
  weekdays_only boolean not null default true,
  warmup boolean not null default true,
  paused boolean not null default true,
  admin_stopped boolean not null default false,
  admin_stop_reason text,
  updated_at timestamptz not null default now(),
  constraint outreach_work_window check (work_start >= time '06:00' and work_end <= time '22:00' and work_end > work_start)
);

alter table public.outreach_settings enable row level security;
create policy outreach_settings_select on public.outreach_settings for select to authenticated
  using (public.is_member(workspace_id) or public.is_admin());
revoke all on public.outreach_settings from anon, authenticated;
grant select on public.outreach_settings to authenticated;

-- The owner saves their limits. Values outside the hard limits are refused by the table's checks.
create function public.outreach_settings_save(
  p_ws uuid, p_invites int, p_messages int, p_start time, p_end time, p_tz text, p_weekdays boolean, p_warmup boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(p_ws, 'client_owner') then raise exception 'not allowed' using errcode = '42501'; end if;
  if not exists (select 1 from pg_timezone_names where name = p_tz) then raise exception 'unknown timezone' using errcode = '22023'; end if;
  insert into public.outreach_settings (workspace_id, invites_per_day, messages_per_day, work_start, work_end, timezone, weekdays_only, warmup)
    values (p_ws, p_invites, p_messages, p_start, p_end, p_tz, p_weekdays, p_warmup)
  on conflict (workspace_id) do update set invites_per_day = excluded.invites_per_day, messages_per_day = excluded.messages_per_day,
    work_start = excluded.work_start, work_end = excluded.work_end, timezone = excluded.timezone,
    weekdays_only = excluded.weekdays_only, warmup = excluded.warmup, updated_at = now();
  insert into public.event_log (workspace_id, actor, action, detail)
    values (p_ws, auth.uid(), 'outreach.settings_saved', jsonb_build_object('invites', p_invites, 'messages', p_messages));
end $$;

-- The owner starts or pauses sending. Starting needs an accepted risk notice and a connected LinkedIn account.
create function public.outreach_set_paused(p_ws uuid, p_paused boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(p_ws, 'client_owner') then raise exception 'not allowed' using errcode = '42501'; end if;
  if not p_paused then
    if not exists (select 1 from public.outreach_consent where workspace_id = p_ws) then raise exception 'risk notice not accepted' using errcode = '23514'; end if;
    if not exists (select 1 from public.outreach_account where workspace_id = p_ws and status = 'ok') then raise exception 'no connected account' using errcode = '23514'; end if;
  end if;
  insert into public.outreach_settings (workspace_id, paused) values (p_ws, p_paused)
  on conflict (workspace_id) do update set paused = excluded.paused, updated_at = now();
  insert into public.event_log (workspace_id, actor, action, detail)
    values (p_ws, auth.uid(), case when p_paused then 'outreach.paused' else 'outreach.resumed' end, '{}'::jsonb);
end $$;

-- Admin kill switch: stops all sending for a workspace whatever the client's own switch says.
create function public.outreach_admin_stop(p_ws uuid, p_stopped boolean, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_stopped and (p_reason is null or length(trim(p_reason)) = 0) then raise exception 'a reason is required' using errcode = '22023'; end if;
  perform 1 from public.workspace where id = p_ws;
  if not found then raise exception 'not found' using errcode = '42501'; end if;
  insert into public.outreach_settings (workspace_id, admin_stopped, admin_stop_reason) values (p_ws, p_stopped, case when p_stopped then left(trim(p_reason), 200) end)
  on conflict (workspace_id) do update set admin_stopped = excluded.admin_stopped, admin_stop_reason = excluded.admin_stop_reason, updated_at = now();
  insert into public.event_log (workspace_id, actor, action, detail)
    values (p_ws, auth.uid(), case when p_stopped then 'outreach.admin_stopped' else 'outreach.admin_released' end, jsonb_build_object('reason', left(coalesce(p_reason, ''), 200)));
end $$;

revoke all on function public.outreach_settings_save(uuid, int, int, time, time, text, boolean, boolean), public.outreach_set_paused(uuid, boolean), public.outreach_admin_stop(uuid, boolean, text) from public, anon;
grant execute on function public.outreach_settings_save(uuid, int, int, time, time, text, boolean, boolean), public.outreach_set_paused(uuid, boolean), public.outreach_admin_stop(uuid, boolean, text) to authenticated;
