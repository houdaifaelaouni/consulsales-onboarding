-- Backend slice 4: access checklist status per workspace. Status only: secrets never live here (they go to Vault).
create table public.access_item (
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  item_id text not null check (length(item_id) between 1 and 40),
  status text not null check (status in ('connected','pending','blocked')),
  blocked_since timestamptz,
  detail text check (detail is null or length(detail) <= 500),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, item_id),
  check (status = 'blocked' or blocked_since is null)
);
alter table public.access_item enable row level security;

create function public.access_item_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  -- keep the original time a block began; reset it when the block clears.
  if new.status = 'blocked' then
    new.blocked_since := coalesce(new.blocked_since, now());
  else
    new.blocked_since := null;
  end if;
  return new;
end $$;
create trigger access_item_stamp before insert or update on public.access_item
  for each row execute function public.access_item_stamp();

create policy access_item_select on public.access_item for select to authenticated
  using (public.is_member(workspace_id) or public.is_admin());
create policy access_item_insert on public.access_item for insert to authenticated
  with check (public.has_role(workspace_id, 'client_owner') or public.is_admin());
create policy access_item_update on public.access_item for update to authenticated
  using (public.has_role(workspace_id, 'client_owner') or public.is_admin())
  with check (public.has_role(workspace_id, 'client_owner') or public.is_admin());
