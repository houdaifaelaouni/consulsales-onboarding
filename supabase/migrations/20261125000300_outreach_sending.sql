-- Sending: the daily record of what went out, the query the sender runs, and the functions that advance a sequence.
-- The daily caps from outreach_settings are checked here, inside the same transaction that logs the send, so no job,
-- screen or retry can go past them. All writes are service-role only; members may read their own counts.

create table public.outreach_send_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  enrollment_id uuid references public.outreach_enrollment (id) on delete set null,
  kind text not null check (kind in ('invite','message')),
  step_position int not null check (step_position between 0 and 8),
  sent_at timestamptz not null default now()
);
create index outreach_send_log_day_idx on public.outreach_send_log (workspace_id, kind, sent_at desc);

alter table public.outreach_send_log enable row level security;
create policy outreach_send_log_select on public.outreach_send_log for select to authenticated
  using (public.is_member(workspace_id) or public.is_admin());
revoke all on public.outreach_send_log from anon, authenticated;
grant select on public.outreach_send_log to authenticated;

-- Workspaces that may send right now: sending switched on, not stopped by us, and a healthy LinkedIn account.
create function public.outreach_run_workspaces() returns table (
  workspace_id uuid, account_id text, invites_per_day int, messages_per_day int,
  work_start text, work_end text, timezone text, weekdays_only boolean, warmup boolean, warmup_from timestamptz
) language sql stable security definer set search_path = public as $$
  select s.workspace_id, a.unipile_account_id, s.invites_per_day, s.messages_per_day,
         to_char(s.work_start, 'HH24:MI'), to_char(s.work_end, 'HH24:MI'), s.timezone, s.weekdays_only, s.warmup,
         (select min(c.launched_at) from public.outreach_campaign c where c.workspace_id = s.workspace_id and c.launched_at is not null)
  from public.outreach_settings s
  join public.outreach_account a on a.workspace_id = s.workspace_id and a.status = 'ok'
  where not s.paused and not s.admin_stopped
$$;

-- The steps that are due in a workspace: a connection request never sent, or a message in an accepted connection.
create function public.outreach_due_sends(p_ws uuid, p_limit int default 40) returns table (
  enrollment_id uuid, lead_id uuid, campaign_id uuid, position int, kind text, body text,
  lead_name text, lead_title text, lead_company text, linkedin_key text,
  provider_id text, chat_id text, accepted_at timestamptz, due_at timestamptz
) language sql stable security definer set search_path = public as $$
  select e.id, e.lead_id, e.campaign_id, e.position, s.kind, s.body,
         l.full_name, l.title, l.company, l.linkedin_key, l.provider_id, e.chat_id, e.accepted_at, e.next_due_at
  from public.outreach_enrollment e
  join public.outreach_campaign c on c.id = e.campaign_id and c.status = 'active'
  join public.outreach_step s on s.campaign_id = e.campaign_id and s.position = e.position
  join public.outreach_lead l on l.id = e.lead_id
  where e.workspace_id = p_ws and e.state = 'active'
    and e.next_due_at is not null and e.next_due_at <= now()
    and ((s.kind = 'invite' and e.invited_at is null) or (s.kind = 'message' and e.accepted_at is not null))
  order by e.next_due_at, e.id
  limit greatest(1, least(coalesce(p_limit, 40), 100))
$$;

-- What already went out today, counted from midnight in the client's own time zone. Members may read their own.
create function public.outreach_send_counts(p_ws uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare tz text; since timestamptz; inv int; msg int;
begin
  if auth.uid() is not null and not (public.is_member(p_ws) or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select timezone into tz from public.outreach_settings where workspace_id = p_ws;
  since := ((now() at time zone coalesce(tz, 'Europe/Madrid'))::date::timestamp at time zone coalesce(tz, 'Europe/Madrid'));
  select count(*) filter (where kind = 'invite'), count(*) filter (where kind = 'message') into inv, msg
    from public.outreach_send_log where workspace_id = p_ws and sent_at >= since;
  return jsonb_build_object('invites', coalesce(inv, 0), 'messages', coalesce(msg, 0), 'since', since);
end $$;

-- Records one send and moves the sequence on. Refuses a step that already moved or a day that is already full.
create function public.outreach_record_send(p_ws uuid, p_enrollment uuid, p_kind text, p_position int, p_chat_id text default null)
returns void language plpgsql security definer set search_path = public as $$
declare e record; tz text; cap int; used int; since timestamptz; nextpos int; delay int;
begin
  select * into e from public.outreach_enrollment where id = p_enrollment and workspace_id = p_ws for update;
  if not found then raise exception 'unknown enrollment' using errcode = '42501'; end if;
  if e.state <> 'active' or e.position <> p_position then raise exception 'step already moved' using errcode = '23514'; end if;
  if p_kind not in ('invite','message') then raise exception 'bad kind' using errcode = '22023'; end if;

  select timezone, case when p_kind = 'invite' then invites_per_day else messages_per_day end
    into tz, cap from public.outreach_settings where workspace_id = p_ws;
  if cap is null then raise exception 'no sending settings' using errcode = '23514'; end if;
  since := ((now() at time zone coalesce(tz, 'Europe/Madrid'))::date::timestamp at time zone coalesce(tz, 'Europe/Madrid'));
  select count(*) into used from public.outreach_send_log
    where workspace_id = p_ws and kind = p_kind and sent_at >= since;
  if used >= cap then raise exception 'daily cap reached' using errcode = '23514'; end if;

  insert into public.outreach_send_log (workspace_id, enrollment_id, kind, step_position)
    values (p_ws, p_enrollment, p_kind, p_position);

  if p_kind = 'invite' then
    update public.outreach_enrollment
      set position = 1, invited_at = now(), awaiting_accept = true, next_due_at = null, attempts = 0, last_error = null
      where id = p_enrollment;
  else
    nextpos := e.position + 1;
    select delay_days into delay from public.outreach_step where campaign_id = e.campaign_id and position = nextpos;
    update public.outreach_enrollment
      set position = nextpos,
          chat_id = coalesce(p_chat_id, chat_id),
          state = case when delay is null then 'completed' else 'active' end,
          next_due_at = case when delay is null then null else now() + make_interval(days => delay) end,
          attempts = 0, last_error = null
      where id = p_enrollment;
  end if;
end $$;

-- A failed step is retried an hour later, and given up after three attempts so the rest of the campaign keeps going.
create function public.outreach_record_failure(p_ws uuid, p_enrollment uuid, p_error text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.outreach_enrollment
    set attempts = attempts + 1,
        last_error = left(coalesce(p_error, 'unknown error'), 280),
        state = case when attempts + 1 >= 3 then 'failed' else state end,
        next_due_at = case when attempts + 1 >= 3 then null else now() + interval '1 hour' end
    where id = p_enrollment and workspace_id = p_ws and state = 'active';
end $$;

-- The Provider id of a lead, learned once from their public address.
create function public.outreach_lead_set_provider(p_ws uuid, p_lead uuid, p_provider text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.outreach_lead set provider_id = left(p_provider, 200)
    where id = p_lead and workspace_id = p_ws and provider_id is null;
end $$;

-- An invitation was accepted. The first message becomes due after its own delay; nothing changes twice.
create function public.outreach_enrollment_accepted(p_ws uuid, p_provider text, p_public_identifier text)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.outreach_enrollment e
    set accepted_at = coalesce(e.accepted_at, now()), awaiting_accept = false,
        next_due_at = coalesce(e.next_due_at, now() + make_interval(days => coalesce(
          (select s.delay_days from public.outreach_step s where s.campaign_id = e.campaign_id and s.position = e.position), 0))),
        attempts = 0
    from public.outreach_lead l
    where l.id = e.lead_id and e.workspace_id = p_ws and e.state = 'active' and e.accepted_at is null
      and (l.provider_id = p_provider or (p_public_identifier is not null and l.linkedin_key = lower(p_public_identifier)));
  get diagnostics n = row_count;
  return n;
end $$;

-- The lead wrote back. Their sequence stops and the chat is kept for a person to follow up.
create function public.outreach_enrollment_replied(p_ws uuid, p_provider text, p_public_identifier text, p_chat_id text)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.outreach_enrollment e
    set state = 'replied', next_due_at = null, awaiting_accept = false, chat_id = coalesce(p_chat_id, e.chat_id)
    from public.outreach_lead l
    where l.id = e.lead_id and e.workspace_id = p_ws and e.state = 'active'
      and (e.chat_id = p_chat_id
        or l.provider_id = p_provider
        or (p_public_identifier is not null and l.linkedin_key = lower(p_public_identifier)));
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.outreach_run_workspaces(), public.outreach_due_sends(uuid, int),
  public.outreach_record_send(uuid, uuid, text, int, text), public.outreach_record_failure(uuid, uuid, text),
  public.outreach_lead_set_provider(uuid, uuid, text), public.outreach_enrollment_accepted(uuid, text, text),
  public.outreach_enrollment_replied(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.outreach_run_workspaces(), public.outreach_due_sends(uuid, int),
  public.outreach_record_send(uuid, uuid, text, int, text), public.outreach_record_failure(uuid, uuid, text),
  public.outreach_lead_set_provider(uuid, uuid, text), public.outreach_enrollment_accepted(uuid, text, text),
  public.outreach_enrollment_replied(uuid, text, text, text) to service_role;

revoke all on function public.outreach_send_counts(uuid) from public, anon;
grant execute on function public.outreach_send_counts(uuid) to authenticated, service_role;
