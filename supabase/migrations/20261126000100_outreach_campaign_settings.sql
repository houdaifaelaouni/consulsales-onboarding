-- What the create dialog asks for and what the campaign workspace shows: a description, one channel, and the optional
-- touches (engage before/after, contact again after 60-90 days, skip people already in a conversation, warm-up mode).
-- The channel is stored even though only LinkedIn can send: it keeps the screen honest and leaves room for other senders.

alter table public.outreach_campaign
  add column description text check (length(description) <= 500),
  add column channel text not null default 'LINKEDIN'
    check (channel in ('LINKEDIN','INSTAGRAM','FACEBOOK','X','TIKTOK','REDDIT','THREADS','DISCORD')),
  add column engage_before boolean not null default false,
  add column engage_after boolean not null default false,
  add column contact_again_days int check (contact_again_days is null or contact_again_days between 60 and 90),
  add column skip_existing boolean not null default false,
  add column warmup_mode boolean not null default false;

-- Creates an empty draft with the options from the dialog. The steps come later, from the Build tab.
create function public.outreach_campaign_create(
  p_ws uuid,
  p_name text,
  p_description text default null,
  p_channel text default 'LINKEDIN',
  p_options jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid; nm text := trim(coalesce(p_name, ''));
begin
  if not public.has_role(p_ws, 'client_owner') then raise exception 'not allowed' using errcode = '42501'; end if;
  if length(nm) < 1 or length(nm) > 80 then raise exception 'bad name' using errcode = '22023'; end if;
  if p_channel not in ('LINKEDIN','INSTAGRAM','FACEBOOK','X','TIKTOK','REDDIT','THREADS','DISCORD') then
    raise exception 'bad channel' using errcode = '22023';
  end if;
  insert into public.outreach_campaign (
    workspace_id, name, description, channel, engage_before, engage_after, contact_again_days, skip_existing, warmup_mode
  ) values (
    p_ws, nm, nullif(left(coalesce(p_description, ''), 500), ''), p_channel,
    coalesce((p_options ->> 'engage_before')::boolean, false),
    coalesce((p_options ->> 'engage_after')::boolean, false),
    nullif((p_options ->> 'contact_again_days')::int, 0),
    coalesce((p_options ->> 'skip_existing')::boolean, false),
    coalesce((p_options ->> 'warmup_mode')::boolean, false)
  ) returning id into cid;
  insert into public.event_log (workspace_id, actor, action, detail)
    values (p_ws, auth.uid(), 'outreach.campaign_created', jsonb_build_object('campaign', cid, 'channel', p_channel));
  return cid;
end $$;

-- Copies a campaign and its steps into a new draft. Enrollments are not copied: a lead is only ever in one campaign.
create function public.outreach_campaign_duplicate(p_ws uuid, p_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare src record; cid uuid; nm text;
begin
  if not public.has_role(p_ws, 'client_owner') then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into src from public.outreach_campaign where id = p_id and workspace_id = p_ws;
  if not found then raise exception 'unknown campaign' using errcode = '42501'; end if;
  nm := left(src.name || ' (copy)', 80);
  insert into public.outreach_campaign (
    workspace_id, name, description, channel, engage_before, engage_after, contact_again_days, skip_existing, warmup_mode
  ) values (
    p_ws, nm, src.description, src.channel, src.engage_before, src.engage_after, src.contact_again_days, src.skip_existing, src.warmup_mode
  ) returning id into cid;
  insert into public.outreach_step (campaign_id, workspace_id, position, kind, delay_days, body)
    select cid, p_ws, position, kind, delay_days, body from public.outreach_step where campaign_id = p_id order by position;
  return cid;
end $$;

revoke all on function public.outreach_campaign_create(uuid, text, text, text, jsonb), public.outreach_campaign_duplicate(uuid, uuid)
  from public, anon;
grant execute on function public.outreach_campaign_create(uuid, text, text, text, jsonb), public.outreach_campaign_duplicate(uuid, uuid)
  to authenticated;
