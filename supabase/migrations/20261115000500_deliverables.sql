-- Backend slice 5: deliverables, immutable versions, and approval decided only through a checked function.
create table public.deliverable (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  kind text not null check (kind in ('icp','positioning','profile','dm_sequence','post')),
  title text not null check (length(title) between 1 and 120),
  status text not null default 'draft' check (status in ('draft','in_review','changes_requested','approved')),
  unlocks text check (unlocks is null or length(unlocks) <= 200),
  change_note text check (change_note is null or length(change_note) <= 2000),
  approved_by uuid references public.app_user (id),
  approved_at timestamptz,
  approved_version int,
  created_at timestamptz not null default now()
);
create index deliverable_workspace_idx on public.deliverable (workspace_id);
alter table public.deliverable enable row level security;

create table public.deliverable_version (
  deliverable_id uuid not null references public.deliverable (id) on delete cascade,
  n int not null check (n >= 1),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  content text not null default '' check (length(content) <= 50000),
  profile jsonb check (profile is null or jsonb_typeof(profile) = 'object'),
  created_by uuid references public.app_user (id),
  created_at timestamptz not null default now(),
  primary key (deliverable_id, n)
);
alter table public.deliverable_version enable row level security;

-- Versions are never edited or removed (a change is a new version). Deleting the whole deliverable cascades one level deeper.
create function public.deliverable_version_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare d public.deliverable;
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  if tg_op <> 'INSERT' then raise exception 'versions are immutable' using errcode = '42501'; end if;
  select * into d from public.deliverable where id = new.deliverable_id;
  if d.id is null or d.workspace_id <> new.workspace_id then raise exception 'version must match its deliverable' using errcode = '23514'; end if;
  if d.status = 'approved' then raise exception 'approved deliverables are locked' using errcode = '42501'; end if;
  new.created_by := auth.uid();
  new.created_at := now();
  return new;
end $$;
create trigger deliverable_version_guard before insert or update or delete on public.deliverable_version
  for each row execute function public.deliverable_version_guard();
revoke update, delete, truncate on public.deliverable_version from authenticated, anon;

create policy deliverable_select on public.deliverable for select to authenticated
  using (public.is_member(workspace_id) or public.is_admin());
create policy deliverable_insert on public.deliverable for insert to authenticated
  with check ((public.has_role(workspace_id, 'delivery_lead') or public.is_admin()) and status = 'draft');
-- No update policy: status moves only through the functions below.
revoke update, delete, truncate on public.deliverable from authenticated, anon;

create policy deliverable_version_select on public.deliverable_version for select to authenticated
  using (public.is_member(workspace_id) or public.is_admin());
create policy deliverable_version_insert on public.deliverable_version for insert to authenticated
  with check (public.has_role(workspace_id, 'delivery_lead') or public.is_admin());

-- Delivery lead or admin sends a draft (or a revised deliverable) to the client.
create function public.deliverable_submit(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d public.deliverable;
begin
  select * into d from public.deliverable where id = p_id;
  if d.id is null or not (public.has_role(d.workspace_id, 'delivery_lead') or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if d.status not in ('draft','changes_requested') then raise exception 'cannot submit from %', d.status using errcode = '23514'; end if;
  if not exists (select 1 from public.deliverable_version where deliverable_id = p_id) then raise exception 'no version to review' using errcode = '23514'; end if;
  update public.deliverable set status = 'in_review', change_note = null where id = p_id;
  insert into public.event_log (workspace_id, actor, action, detail)
    values (d.workspace_id, auth.uid(), 'deliverable.submitted', jsonb_build_object('deliverable', p_id, 'kind', d.kind));
end $$;

-- The client owner approves or asks for changes; an admin may override (logged as such).
create function public.deliverable_decide(p_id uuid, p_decision text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare d public.deliverable; v int; override boolean; act text;
begin
  if p_decision not in ('approve','request_changes') then raise exception 'bad decision' using errcode = '22023'; end if;
  select * into d from public.deliverable where id = p_id;
  if d.id is null then raise exception 'not found' using errcode = '42501'; end if;
  override := not public.has_role(d.workspace_id, 'client_owner');
  if override and not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if d.status <> 'in_review' then raise exception 'not in review' using errcode = '23514'; end if;
  select max(n) into v from public.deliverable_version where deliverable_id = p_id;
  if p_decision = 'approve' then
    update public.deliverable set status = 'approved', approved_by = auth.uid(), approved_at = now(), approved_version = v where id = p_id;
    act := case when override then 'deliverable.approved_override' else 'deliverable.approved' end;
  else
    if p_note is null or length(trim(p_note)) = 0 then raise exception 'a note is required' using errcode = '22023'; end if;
    update public.deliverable set status = 'changes_requested', change_note = left(p_note, 2000) where id = p_id;
    act := case when override then 'deliverable.changes_requested_override' else 'deliverable.changes_requested' end;
  end if;
  insert into public.event_log (workspace_id, actor, action, detail)
    values (d.workspace_id, auth.uid(), act, jsonb_build_object('deliverable', p_id, 'kind', d.kind, 'version', v));
end $$;

revoke all on function public.deliverable_submit(uuid), public.deliverable_decide(uuid, text, text) from public, anon;
grant execute on function public.deliverable_submit(uuid), public.deliverable_decide(uuid, text, text) to authenticated;
