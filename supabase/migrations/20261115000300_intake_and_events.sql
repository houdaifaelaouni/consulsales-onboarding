-- Backend slice 1: intake answers and the append-only event log. RLS on both.

-- ---------------------------------------------------------------- intake_answer
create table public.intake_answer (
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  question_key text not null check (length(question_key) between 1 and 80),
  -- { value: string, notSure?: boolean, note?: string }
  value jsonb not null check (jsonb_typeof(value) = 'object' and pg_column_size(value) < 20000),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.app_user (id),
  primary key (workspace_id, question_key)
);
alter table public.intake_answer enable row level security;

-- The server decides who and when, so a client cannot forge them.
create function public.intake_answer_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
create trigger intake_answer_stamp before insert or update on public.intake_answer
  for each row execute function public.intake_answer_stamp();

-- Members and admins read. Only the client owner (or an admin) writes: delivery leads comment, they do not answer.
create policy intake_answer_select on public.intake_answer for select to authenticated
  using (public.is_member(workspace_id) or public.is_admin());
create policy intake_answer_insert on public.intake_answer for insert to authenticated
  with check (public.has_role(workspace_id, 'client_owner') or public.is_admin());
create policy intake_answer_update on public.intake_answer for update to authenticated
  using (public.has_role(workspace_id, 'client_owner') or public.is_admin())
  with check (public.has_role(workspace_id, 'client_owner') or public.is_admin());
-- No delete policy: answers are changed, never silently removed.

-- ---------------------------------------------------------------- event_log
create table public.event_log (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  actor uuid references public.app_user (id),
  action text not null check (length(action) between 1 and 80),
  detail jsonb not null default '{}' check (jsonb_typeof(detail) = 'object' and pg_column_size(detail) < 20000),
  at timestamptz not null default now()
);
create index event_log_workspace_idx on public.event_log (workspace_id, at desc);
alter table public.event_log enable row level security;

create policy event_log_select on public.event_log for select to authenticated
  using (public.is_member(workspace_id) or public.is_admin());
-- A person can only write events about their own workspace, as themselves.
create policy event_log_insert on public.event_log for insert to authenticated
  with check ((public.is_member(workspace_id) or public.is_admin()) and actor = auth.uid());

-- Append-only: rows can never be edited. Deleting is blocked too, except when the whole workspace is
-- removed (the cascade runs one trigger level deeper), which the 12-month retention rule needs.
create function public.event_log_immutable() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  raise exception 'event_log is append-only' using errcode = '42501';
end $$;
create trigger event_log_immutable before update or delete on public.event_log
  for each row execute function public.event_log_immutable();
revoke update, delete, truncate on public.event_log from authenticated, anon;
