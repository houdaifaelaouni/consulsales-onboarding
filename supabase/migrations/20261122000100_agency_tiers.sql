-- Agencies: an account that onboards its own clients. Each client is a workspace that belongs to one agency.
-- The tier sets how many client rooms an agency may open: free = 1 in total, paid tiers = N per calendar month.
-- The limit is enforced here in the database, so no screen or job can skip it. Tier changes are service-role only (payment webhook).

create table public.agency (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tier text not null default 'free' check (tier in ('free','starter','growth','scale')),
  whop_membership_id text,
  created_at timestamptz not null default now()
);

create table public.agency_member (
  agency_id uuid not null references public.agency (id) on delete cascade,
  user_id uuid not null references public.app_user (id) on delete cascade,
  role text not null check (role in ('owner','member')),
  primary key (agency_id, user_id)
);
create index agency_member_user_idx on public.agency_member (user_id);

alter table public.workspace add column agency_id uuid references public.agency (id);
create index workspace_agency_idx on public.workspace (agency_id);

create function public.is_agency_member(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.agency_member where agency_id = a and user_id = auth.uid())
$$;
revoke all on function public.is_agency_member(uuid) from public, anon;
grant execute on function public.is_agency_member(uuid) to authenticated;

create function public.agency_room_limit(p_tier text) returns int
language sql immutable as $$
  select case p_tier when 'free' then 1 when 'starter' then 3 when 'growth' then 10 when 'scale' then 50 else 0 end
$$;

-- Rooms counted against the limit: free = every room ever opened; paid tiers = rooms opened this calendar month.
create function public.agency_rooms_used(p_agency uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.workspace w
  where w.agency_id = p_agency
    and ((select tier from public.agency where id = p_agency) = 'free' or w.created_at >= date_trunc('month', now()))
$$;
revoke all on function public.agency_rooms_used(uuid) from public, anon;
grant execute on function public.agency_rooms_used(uuid) to authenticated;

create function public.enforce_agency_room_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if new.agency_id is null then return new; end if;
  select tier into t from public.agency where id = new.agency_id for update;
  if not found then raise exception 'agency not found' using errcode = '23503'; end if;
  if public.agency_rooms_used(new.agency_id) >= public.agency_room_limit(t) then
    raise exception 'room limit reached for the % tier', t using errcode = '23514';
  end if;
  return new;
end $$;
create trigger workspace_room_limit before insert on public.workspace
  for each row execute function public.enforce_agency_room_limit();

alter table public.agency enable row level security;
alter table public.agency_member enable row level security;
create policy agency_select on public.agency for select to authenticated
  using (public.is_agency_member(id) or public.is_admin());
create policy agency_member_select on public.agency_member for select to authenticated
  using (user_id = auth.uid() or public.is_agency_member(agency_id) or public.is_admin());
create policy workspace_select_agency on public.workspace for select to authenticated
  using (agency_id is not null and public.is_agency_member(agency_id));
revoke all on public.agency, public.agency_member from anon, authenticated;
grant select on public.agency, public.agency_member to authenticated;
