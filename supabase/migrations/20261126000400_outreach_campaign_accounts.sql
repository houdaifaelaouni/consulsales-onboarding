-- Which of the client's connected profiles run a campaign. One account can run several campaigns; the daily limit is
-- split between them by the planner, never multiplied. Assignment is one checked function: the browser only reads.

create table public.outreach_campaign_account (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  campaign_id uuid not null references public.outreach_campaign (id) on delete cascade,
  account_id uuid not null references public.outreach_account (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (campaign_id, account_id)
);
create index outreach_campaign_account_ws_idx on public.outreach_campaign_account (workspace_id, campaign_id);

alter table public.outreach_campaign_account enable row level security;
create policy outreach_campaign_account_select on public.outreach_campaign_account for select to authenticated
  using (public.is_member(workspace_id) or public.is_admin());
revoke all on public.outreach_campaign_account from anon, authenticated;
grant select on public.outreach_campaign_account to authenticated;

-- Replace the profiles of one campaign. Accounts from another workspace are ignored, and only healthy accounts are kept.
create function public.outreach_campaign_accounts_set(p_ws uuid, p_campaign uuid, p_accounts uuid[]) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.has_role(p_ws, 'client_owner') then raise exception 'not allowed' using errcode = '42501'; end if;
  if not exists (select 1 from public.outreach_campaign where id = p_campaign and workspace_id = p_ws) then
    raise exception 'unknown campaign' using errcode = '42501';
  end if;
  delete from public.outreach_campaign_account where campaign_id = p_campaign and workspace_id = p_ws;
  insert into public.outreach_campaign_account (workspace_id, campaign_id, account_id)
    select p_ws, p_campaign, a.id from public.outreach_account a
    where a.workspace_id = p_ws and a.status = 'ok' and a.id = any(coalesce(p_accounts, '{}'::uuid[]));
  get diagnostics n = row_count;
  return n;
end $$;

-- Everything the Campaign tab shows, from the enrollments and the send log of this campaign only.
create function public.outreach_campaign_analytics(p_ws uuid, p_campaign uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  inv int; msg int; total int; accepted int; replies int; positive int; meetings int; conversations int;
  stopped int; completed int; failed int; pending int; inprogress int; steps jsonb;
begin
  if auth.uid() is not null and not (public.is_member(p_ws) or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.outreach_campaign where id = p_campaign and workspace_id = p_ws) then
    raise exception 'unknown campaign' using errcode = '42501';
  end if;

  select count(*) filter (where l.kind = 'invite'), count(*) filter (where l.kind = 'message')
    into inv, msg
    from public.outreach_send_log l
    join public.outreach_enrollment e on e.id = l.enrollment_id
    where l.workspace_id = p_ws and e.campaign_id = p_campaign;

  select count(*),
         count(*) filter (where accepted_at is not null),
         count(*) filter (where state = 'replied'),
         count(*) filter (where state = 'replied' and reply_class = 'positive'),
         count(*) filter (where meeting_booked_at is not null),
         count(*) filter (where state = 'replied' and chat_id is not null),
         count(*) filter (where state = 'stopped'),
         count(*) filter (where state = 'completed'),
         count(*) filter (where state = 'failed'),
         count(*) filter (where state = 'active' and not awaiting_accept),
         count(*) filter (where state = 'active' and awaiting_accept)
    into total, accepted, replies, positive, meetings, conversations, stopped, completed, failed, pending, inprogress
    from public.outreach_enrollment
    where workspace_id = p_ws and campaign_id = p_campaign;

  select coalesce(jsonb_agg(s order by s.step), '[]'::jsonb) into steps from (
    select position as step, count(*)::int as leads
    from public.outreach_enrollment
    where workspace_id = p_ws and campaign_id = p_campaign
    group by position
  ) s;

  return jsonb_build_object(
    'leads', coalesce(total, 0), 'invites', coalesce(inv, 0), 'messages', coalesce(msg, 0),
    'accepted', coalesce(accepted, 0), 'replies', coalesce(replies, 0), 'positive', coalesce(positive, 0),
    'conversations', coalesce(conversations, 0), 'meetings', coalesce(meetings, 0),
    'completed', coalesce(completed, 0), 'failed', coalesce(failed, 0), 'stopped', coalesce(stopped, 0),
    'pending', coalesce(pending, 0), 'inProgress', coalesce(inprogress, 0), 'steps', steps
  );
end $$;

revoke all on function public.outreach_campaign_accounts_set(uuid, uuid, uuid[]), public.outreach_campaign_analytics(uuid, uuid)
  from public, anon;
grant execute on function public.outreach_campaign_accounts_set(uuid, uuid, uuid[]), public.outreach_campaign_analytics(uuid, uuid)
  to authenticated;
