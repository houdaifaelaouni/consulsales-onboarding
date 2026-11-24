-- The campaign leads table shows more than a name and a profile: email, phone, first and last name, company domain and
-- location. They are optional (a LinkedIn export usually has none of them) and only ever come from the client's own file.
-- The full name stays the source of truth for the sequence placeholders; first and last are kept in step with it.

alter table public.outreach_lead
  add column first_name text check (length(first_name) <= 80),
  add column last_name text check (length(last_name) <= 80),
  add column email text check (length(email) <= 200),
  add column phone text check (length(phone) <= 40),
  add column company_domain text check (length(company_domain) <= 160),
  add column location text check (length(location) <= 160),
  add column platform text not null default 'linkedin'
    check (platform in ('linkedin','instagram','facebook','x','tiktok','reddit','threads','discord'));

-- Fill first and last for the leads that are already in the list.
update public.outreach_lead set
  first_name = split_part(trim(full_name), ' ', 1),
  last_name = nullif(trim(substr(trim(full_name), length(split_part(trim(full_name), ' ', 1)) + 1)), '')
where first_name is null;

-- A new lead gets the split name automatically; a name we do not have is left empty, never guessed.
create function public.outreach_lead_names() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.first_name is null then new.first_name := nullif(split_part(trim(new.full_name), ' ', 1), ''); end if;
  if new.last_name is null then
    new.last_name := nullif(trim(substr(trim(new.full_name), length(split_part(trim(new.full_name), ' ', 1)) + 1)), '');
  end if;
  return new;
end $$;

create trigger outreach_lead_names_fill before insert or update of full_name on public.outreach_lead
  for each row execute function public.outreach_lead_names();

-- The import now reads the extra columns. Everything else is unchanged: 5,000 rows a call, 20,000 a workspace,
-- people already in the list are skipped.
create or replace function public.outreach_leads_import(p_ws uuid, p_rows jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare total int; added int; existing int;
begin
  if not public.has_role(p_ws, 'client_owner') then raise exception 'not allowed' using errcode = '42501'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'rows must be a list' using errcode = '22023'; end if;
  total := jsonb_array_length(p_rows);
  if total = 0 or total > 5000 then raise exception 'between 1 and 5000 rows' using errcode = '22023'; end if;
  select count(*) into existing from public.outreach_lead where workspace_id = p_ws;
  if existing + total > 20000 then raise exception 'lead limit reached' using errcode = '23514'; end if;

  insert into public.outreach_lead (
    workspace_id, full_name, title, company, linkedin_key, linkedin_url,
    first_name, last_name, email, phone, company_domain, location
  )
  select p_ws, left(r.full_name, 120), nullif(left(r.title, 160), ''), nullif(left(r.company, 160), ''),
         left(r.linkedin_key, 200), left(r.linkedin_url, 400),
         nullif(left(r.first_name, 80), ''), nullif(left(r.last_name, 80), ''),
         nullif(left(r.email, 200), ''), nullif(left(r.phone, 40), ''),
         nullif(left(r.company_domain, 160), ''), nullif(left(r.location, 160), '')
  from jsonb_to_recordset(p_rows) as r(
    full_name text, title text, company text, linkedin_key text, linkedin_url text,
    first_name text, last_name text, email text, phone text, company_domain text, location text
  )
  where coalesce(trim(r.full_name), '') <> '' and coalesce(trim(r.linkedin_key), '') <> ''
  on conflict (workspace_id, linkedin_key) do nothing;
  get diagnostics added = row_count;

  insert into public.event_log (workspace_id, actor, action, detail)
    values (p_ws, auth.uid(), 'outreach.leads_imported', jsonb_build_object('rows', total, 'added', added));
  return jsonb_build_object('added', added, 'duplicates', total - added);
end $$;
