-- The AI Super Agents page edits one knowledge base per workspace: the company context, the ideal customer profile, how
-- the agents introduce themselves, the positioning, extra writing instructions and notes. No language model reads it yet;
-- storing it now means the agent runtime has a real source instead of copy hidden in a screen.

create table public.outreach_agent_profile (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspace (id) on delete cascade,
  domain text check (length(domain) <= 200),
  context text check (length(context) <= 8000),
  icp text check (length(icp) <= 4000),
  identity text not null default 'ai' check (identity in ('ai','founder')),
  positioning text check (length(positioning) <= 1000),
  instructions text check (length(instructions) <= 4000),
  notes text check (length(notes) <= 2000),
  timezone text not null default 'Europe/Madrid',
  updated_at timestamptz not null default now()
);

alter table public.outreach_agent_profile enable row level security;
create policy outreach_agent_profile_select on public.outreach_agent_profile for select to authenticated
  using (public.is_member(workspace_id) or public.is_admin());
revoke all on public.outreach_agent_profile from anon, authenticated;
grant select on public.outreach_agent_profile to authenticated;

-- One call per change. The first save creates the row; later saves overwrite it as a whole.
create function public.outreach_agent_profile_save(
  p_ws uuid,
  p_domain text,
  p_context text,
  p_icp text,
  p_identity text,
  p_positioning text,
  p_instructions text,
  p_notes text,
  p_timezone text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(p_ws, 'client_owner') then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_identity not in ('ai','founder') then raise exception 'bad identity' using errcode = '22023'; end if;
  insert into public.outreach_agent_profile (
    workspace_id, domain, context, icp, identity, positioning, instructions, notes, timezone
  ) values (
    p_ws, nullif(left(coalesce(p_domain, ''), 200), ''), nullif(left(coalesce(p_context, ''), 8000), ''),
    nullif(left(coalesce(p_icp, ''), 4000), ''), p_identity,
    nullif(left(coalesce(p_positioning, ''), 1000), ''), nullif(left(coalesce(p_instructions, ''), 4000), ''),
    nullif(left(coalesce(p_notes, ''), 2000), ''), coalesce(nullif(trim(p_timezone), ''), 'Europe/Madrid')
  )
  on conflict (workspace_id) do update set
    domain = excluded.domain, context = excluded.context, icp = excluded.icp, identity = excluded.identity,
    positioning = excluded.positioning, instructions = excluded.instructions, notes = excluded.notes,
    timezone = excluded.timezone, updated_at = now();
end $$;

revoke all on function public.outreach_agent_profile_save(uuid, text, text, text, text, text, text, text, text)
  from public, anon;
grant execute on function public.outreach_agent_profile_save(uuid, text, text, text, text, text, text, text, text)
  to authenticated;
