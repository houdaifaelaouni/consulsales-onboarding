-- Leads a client wants to contact. They come in from a CSV, are de-duplicated by LinkedIn profile, and only leads the
-- client has approved are ever contacted. Writes go through checked functions; the browser cannot write the table.

create table public.outreach_lead (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  full_name text not null check (length(full_name) between 1 and 120),
  title text check (length(title) <= 160),
  company text check (length(company) <= 160),
  linkedin_key text not null check (length(linkedin_key) between 1 and 200),
  linkedin_url text not null check (length(linkedin_url) <= 400),
  provider_id text,
  status text not null default 'new' check (status in ('new','approved','rejected')),
  created_at timestamptz not null default now(),
  unique (workspace_id, linkedin_key)
);
create index outreach_lead_status_idx on public.outreach_lead (workspace_id, status, created_at desc);

alter table public.outreach_lead enable row level security;
create policy outreach_lead_select on public.outreach_lead for select to authenticated
  using (public.is_member(workspace_id) or public.is_admin());
revoke all on public.outreach_lead from anon, authenticated;
grant select on public.outreach_lead to authenticated;

-- Adds leads from a parsed file. Up to 5,000 rows a call and 20,000 per workspace. People already in the list are skipped.
create function public.outreach_leads_import(p_ws uuid, p_rows jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare total int; added int; existing int;
begin
  if not public.has_role(p_ws, 'client_owner') then raise exception 'not allowed' using errcode = '42501'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'rows must be a list' using errcode = '22023'; end if;
  total := jsonb_array_length(p_rows);
  if total = 0 or total > 5000 then raise exception 'between 1 and 5000 rows' using errcode = '22023'; end if;
  select count(*) into existing from public.outreach_lead where workspace_id = p_ws;
  if existing + total > 20000 then raise exception 'lead limit reached' using errcode = '23514'; end if;

  insert into public.outreach_lead (workspace_id, full_name, title, company, linkedin_key, linkedin_url)
  select p_ws, left(r.full_name, 120), nullif(left(r.title, 160), ''), nullif(left(r.company, 160), ''), left(r.linkedin_key, 200), left(r.linkedin_url, 400)
  from jsonb_to_recordset(p_rows) as r(full_name text, title text, company text, linkedin_key text, linkedin_url text)
  where coalesce(trim(r.full_name), '') <> '' and coalesce(trim(r.linkedin_key), '') <> ''
  on conflict (workspace_id, linkedin_key) do nothing;
  get diagnostics added = row_count;

  insert into public.event_log (workspace_id, actor, action, detail)
    values (p_ws, auth.uid(), 'outreach.leads_imported', jsonb_build_object('rows', total, 'added', added));
  return jsonb_build_object('added', added, 'duplicates', total - added);
end $$;

-- Approve, reject or return leads to review. Only the owner, only their own leads.
create function public.outreach_leads_set_status(p_ws uuid, p_ids uuid[], p_status text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.has_role(p_ws, 'client_owner') then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_status not in ('new','approved','rejected') then raise exception 'bad status' using errcode = '22023'; end if;
  if coalesce(array_length(p_ids, 1), 0) > 1000 then raise exception 'at most 1000 at a time' using errcode = '22023'; end if;
  update public.outreach_lead set status = p_status where workspace_id = p_ws and id = any(p_ids) and status <> p_status;
  get diagnostics n = row_count;
  return n;
end $$;

create function public.outreach_leads_approve_all(p_ws uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.has_role(p_ws, 'client_owner') then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.outreach_lead set status = 'approved' where workspace_id = p_ws and status = 'new';
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.outreach_leads_import(uuid, jsonb), public.outreach_leads_set_status(uuid, uuid[], text), public.outreach_leads_approve_all(uuid) from public, anon;
grant execute on function public.outreach_leads_import(uuid, jsonb), public.outreach_leads_set_status(uuid, uuid[], text), public.outreach_leads_approve_all(uuid) to authenticated;
