-- S0.2 core schema: workspace, app_user, membership, task. RLS on every table.
create type public.member_role as enum ('client_owner', 'delivery_lead', 'admin');
create type public.task_status as enum ('todo', 'in_progress', 'blocked', 'done');
create type public.workspace_stage as enum ('intake', 'building', 'review', 'live');

create table public.app_user (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  locale text not null default 'en' check (locale in ('en','fr','es','de','pt-br','zh')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.workspace (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  plan text not null check (plan in ('starter','pro','enterprise')),
  stage public.workspace_stage not null default 'intake',
  start_date date not null default current_date,
  language text not null default 'en' check (language in ('en','fr','es','de','pt-br','zh')),
  owner_id uuid references public.app_user (id),
  created_at timestamptz not null default now()
);

create table public.membership (
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  user_id uuid not null references public.app_user (id) on delete cascade,
  role public.member_role not null,
  primary key (workspace_id, user_id)
);
create index membership_user_idx on public.membership (user_id);

create table public.task (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  type text not null,
  status public.task_status not null default 'todo',
  due_at timestamptz,
  assignee uuid references public.app_user (id),
  created_at timestamptz not null default now()
);
create index task_workspace_idx on public.task (workspace_id);

-- Helpers (security definer so policies on membership do not recurse).
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.app_user where id = auth.uid()), false)
$$;

create function public.is_member(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.membership where workspace_id = ws and user_id = auth.uid())
$$;

create function public.has_role(ws uuid, r public.member_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.membership where workspace_id = ws and user_id = auth.uid() and role = r)
$$;

revoke all on function public.is_admin(), public.is_member(uuid), public.has_role(uuid, public.member_role) from public, anon;
grant execute on function public.is_admin(), public.is_member(uuid), public.has_role(uuid, public.member_role) to authenticated;

-- Create the profile row when a user signs up via magic link.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.app_user (id, email) values (new.id, new.email);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.app_user   enable row level security;
alter table public.workspace  enable row level security;
alter table public.membership enable row level security;
alter table public.task       enable row level security;

-- app_user: see yourself (and admins see everyone); edit only own name/locale.
create policy app_user_select on public.app_user for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy app_user_update on public.app_user for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and is_admin = (select is_admin from public.app_user where id = auth.uid()));

-- workspace: members and admins read. Writes happen server-side with the service role.
create policy workspace_select on public.workspace for select to authenticated
  using (public.is_member(id) or public.is_admin());

-- membership: see your own rows, plus all rows of workspaces you belong to; admins see all.
create policy membership_select on public.membership for select to authenticated
  using (user_id = auth.uid() or public.is_member(workspace_id) or public.is_admin());

-- task: members and admins read; client owners, delivery leads and admins update status.
create policy task_select on public.task for select to authenticated
  using (public.is_member(workspace_id) or public.is_admin());
create policy task_update on public.task for update to authenticated
  using (public.is_admin() or public.has_role(workspace_id, 'client_owner') or public.has_role(workspace_id, 'delivery_lead'))
  with check (public.is_admin() or public.has_role(workspace_id, 'client_owner') or public.has_role(workspace_id, 'delivery_lead'));
