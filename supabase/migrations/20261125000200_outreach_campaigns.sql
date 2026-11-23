-- Campaigns: a connection request with an optional note, then up to 8 messages, each waiting a number of days after the one
-- before. Launching a campaign enrols every approved lead that is not already in a campaign; a lead is only ever in one.
-- Writes go through checked functions. Rejecting a lead stops its sequence.

create table public.outreach_campaign (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  status text not null default 'draft' check (status in ('draft','active','paused','completed')),
  created_at timestamptz not null default now(),
  launched_at timestamptz
);
create index outreach_campaign_ws_idx on public.outreach_campaign (workspace_id, created_at desc);

create table public.outreach_step (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.outreach_campaign (id) on delete cascade,
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  position int not null check (position between 0 and 8),
  kind text not null check (kind in ('invite','message')),
  delay_days int not null default 0 check (delay_days between 0 and 30),
  body text not null default '' check ((kind = 'invite' and length(body) <= 300) or (kind = 'message' and length(body) between 1 and 2000)),
  unique (campaign_id, position),
  check ((position = 0) = (kind = 'invite'))
);

create table public.outreach_enrollment (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  campaign_id uuid not null references public.outreach_campaign (id) on delete cascade,
  lead_id uuid not null references public.outreach_lead (id) on delete cascade,
  position int not null default 0,
  state text not null default 'active' check (state in ('active','replied','completed','stopped','failed')),
  next_due_at timestamptz,
  awaiting_accept boolean not null default false,
  chat_id text,
  invited_at timestamptz,
  accepted_at timestamptz,
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  unique (workspace_id, lead_id)
);
create index outreach_enrollment_due_idx on public.outreach_enrollment (workspace_id, next_due_at) where state = 'active';
create index outreach_enrollment_campaign_idx on public.outreach_enrollment (campaign_id, state);

alter table public.outreach_campaign enable row level security;
alter table public.outreach_step enable row level security;
alter table public.outreach_enrollment enable row level security;
create policy outreach_campaign_select on public.outreach_campaign for select to authenticated using (public.is_member(workspace_id) or public.is_admin());
create policy outreach_step_select on public.outreach_step for select to authenticated using (public.is_member(workspace_id) or public.is_admin());
create policy outreach_enrollment_select on public.outreach_enrollment for select to authenticated using (public.is_member(workspace_id) or public.is_admin());
revoke all on public.outreach_campaign, public.outreach_step, public.outreach_enrollment from anon, authenticated;
grant select on public.outreach_campaign, public.outreach_step, public.outreach_enrollment to authenticated;

-- Create a draft, or replace a draft's steps. steps: [{"delay_days": 0, "body": "..."}, ...]; the first is the connection request.
create function public.outreach_campaign_save(p_ws uuid, p_id uuid, p_name text, p_steps jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid; n int; i int; s jsonb; nm text := trim(coalesce(p_name, ''));
begin
  if not public.has_role(p_ws, 'client_owner') then raise exception 'not allowed' using errcode = '42501'; end if;
  if length(nm) < 1 or length(nm) > 80 then raise exception 'bad name' using errcode = '22023'; end if;
  if jsonb_typeof(p_steps) <> 'array' then raise exception 'bad steps' using errcode = '22023'; end if;
  n := jsonb_array_length(p_steps);
  if n < 2 or n > 9 then raise exception 'a connection request and 1 to 8 messages' using errcode = '22023'; end if;
  if p_id is null then
    insert into public.outreach_campaign (workspace_id, name) values (p_ws, nm) returning id into cid;
  else
    select id into cid from public.outreach_campaign where id = p_id and workspace_id = p_ws and status = 'draft' for update;
    if cid is null then raise exception 'only a draft can be edited' using errcode = '23514'; end if;
    update public.outreach_campaign set name = nm where id = cid;
    delete from public.outreach_step where campaign_id = cid;
  end if;
  for i in 0 .. n - 1 loop
    s := p_steps -> i;
    insert into public.outreach_step (campaign_id, workspace_id, position, kind, delay_days, body)
      values (cid, p_ws, i, case when i = 0 then 'invite' else 'message' end, case when i = 0 then 0 else coalesce((s ->> 'delay_days')::int, 0) end, coalesce(s ->> 'body', ''));
  end loop;
  return cid;
end $$;

-- Start a draft: every approved lead that is not in a campaign yet is enrolled and becomes due now.
create function public.outreach_campaign_launch(p_ws uuid, p_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare st text; n int;
begin
  if not public.has_role(p_ws, 'client_owner') then raise exception 'not allowed' using errcode = '42501'; end if;
  select status into st from public.outreach_campaign where id = p_id and workspace_id = p_ws for update;
  if st is distinct from 'draft' then raise exception 'only a draft can be launched' using errcode = '23514'; end if;
  insert into public.outreach_enrollment (workspace_id, campaign_id, lead_id, next_due_at)
    select p_ws, p_id, l.id, now() from public.outreach_lead l
    where l.workspace_id = p_ws and l.status = 'approved' and not exists (select 1 from public.outreach_enrollment e where e.lead_id = l.id);
  get diagnostics n = row_count;
  if n = 0 then raise exception 'no approved leads to contact' using errcode = '23514'; end if;
  update public.outreach_campaign set status = 'active', launched_at = now() where id = p_id;
  insert into public.event_log (workspace_id, actor, action, detail) values (p_ws, auth.uid(), 'outreach.campaign_launched', jsonb_build_object('campaign', p_id, 'leads', n));
  return n;
end $$;

-- Add leads approved after launch to a running campaign.
create function public.outreach_campaign_sync(p_ws uuid, p_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare st text; n int;
begin
  if not public.has_role(p_ws, 'client_owner') then raise exception 'not allowed' using errcode = '42501'; end if;
  select status into st from public.outreach_campaign where id = p_id and workspace_id = p_ws;
  if st not in ('active','paused') then raise exception 'campaign is not running' using errcode = '23514'; end if;
  insert into public.outreach_enrollment (workspace_id, campaign_id, lead_id, next_due_at)
    select p_ws, p_id, l.id, now() from public.outreach_lead l
    where l.workspace_id = p_ws and l.status = 'approved' and not exists (select 1 from public.outreach_enrollment e where e.lead_id = l.id);
  get diagnostics n = row_count;
  return n;
end $$;

create function public.outreach_campaign_set_status(p_ws uuid, p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(p_ws, 'client_owner') then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_status not in ('active','paused') then raise exception 'bad status' using errcode = '22023'; end if;
  update public.outreach_campaign set status = p_status where id = p_id and workspace_id = p_ws and status in ('active','paused');
  if not found then raise exception 'campaign is not running' using errcode = '23514'; end if;
end $$;

-- A lead that is no longer approved stops receiving anything.
create function public.outreach_lead_stop_sequence() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'approved' and old.status = 'approved' then
    update public.outreach_enrollment set state = 'stopped', next_due_at = null where lead_id = new.id and state = 'active';
  end if;
  return new;
end $$;
create trigger outreach_lead_status_stops after update of status on public.outreach_lead for each row execute function public.outreach_lead_stop_sequence();

revoke all on function public.outreach_campaign_save(uuid, uuid, text, jsonb), public.outreach_campaign_launch(uuid, uuid), public.outreach_campaign_sync(uuid, uuid), public.outreach_campaign_set_status(uuid, uuid, text) from public, anon;
grant execute on function public.outreach_campaign_save(uuid, uuid, text, jsonb), public.outreach_campaign_launch(uuid, uuid), public.outreach_campaign_sync(uuid, uuid), public.outreach_campaign_set_status(uuid, uuid, text) to authenticated;

-- How many leads of each campaign are in each state. Runs as the caller, so row-level security limits it to their workspace.
create function public.outreach_campaign_counts(p_ws uuid) returns table (campaign_id uuid, state text, n bigint)
language sql stable as $$
  select e.campaign_id, e.state, count(*) from public.outreach_enrollment e where e.workspace_id = p_ws group by 1, 2
$$;
grant execute on function public.outreach_campaign_counts(uuid) to authenticated;

-- Approved leads not yet in any campaign: who a launch or a sync would enrol. Runs as the caller.
create function public.outreach_unenrolled_approved(p_ws uuid) returns bigint
language sql stable as $$
  select count(*) from public.outreach_lead l
  where l.workspace_id = p_ws and l.status = 'approved' and not exists (select 1 from public.outreach_enrollment e where e.lead_id = l.id)
$$;
grant execute on function public.outreach_unenrolled_approved(uuid) to authenticated;
