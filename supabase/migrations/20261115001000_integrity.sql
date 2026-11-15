-- Security fix S2 (audit): the audit log could be forged by any member, approvals could race or approve a version the
-- client never saw, and stage 3 could fail to unlock when two approvals landed at once.

-- 1. Members may add only the one event the browser really needs (intake saved, counts only). Everything else is written by
--    the checked database functions, which are not subject to this policy.
drop policy event_log_insert on public.event_log;
create policy event_log_insert on public.event_log for insert to authenticated
  with check (
    (public.is_member(workspace_id) or public.is_admin()) and actor = auth.uid()
    and action = 'intake.saved' and (detail - 'answered') = '{}'::jsonb
  );

-- 2. No new version while the client is reviewing (or after approval). Share-lock the deliverable so an approval in
--    progress finishes first.
create or replace function public.deliverable_version_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare d public.deliverable;
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  if tg_op <> 'INSERT' then raise exception 'versions are immutable' using errcode = '42501'; end if;
  select * into d from public.deliverable where id = new.deliverable_id for share;
  if d.id is null or d.workspace_id <> new.workspace_id then raise exception 'version must match its deliverable' using errcode = '23514'; end if;
  if d.status in ('approved', 'in_review') then raise exception 'deliverable is locked while in review or approved' using errcode = '42501'; end if;
  new.created_by := auth.uid();
  new.created_at := now();
  return new;
end $$;

-- 3. Submit: lock the row so two clicks cannot both pass the status check.
create or replace function public.deliverable_submit(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d public.deliverable;
begin
  select * into d from public.deliverable where id = p_id for update;
  if d.id is null or not (public.has_role(d.workspace_id, 'delivery_lead') or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if d.status not in ('draft','changes_requested') then raise exception 'cannot submit from %', d.status using errcode = '23514'; end if;
  if not exists (select 1 from public.deliverable_version where deliverable_id = p_id) then raise exception 'no version to review' using errcode = '23514'; end if;
  update public.deliverable set status = 'in_review', change_note = null where id = p_id;
  insert into public.event_log (workspace_id, actor, action, detail)
    values (d.workspace_id, auth.uid(), 'deliverable.submitted', jsonb_build_object('deliverable', p_id, 'kind', d.kind));
end $$;

-- 4. Decide: lock the row, and approving must name the version the client was looking at (it must still be the newest).
drop function public.deliverable_decide(uuid, text, text);
create function public.deliverable_decide(p_id uuid, p_decision text, p_note text default null, p_version int default null) returns void
language plpgsql security definer set search_path = public as $$
declare d public.deliverable; v int; override boolean; act text;
begin
  if p_decision not in ('approve','request_changes') then raise exception 'bad decision' using errcode = '22023'; end if;
  select * into d from public.deliverable where id = p_id for update;
  if d.id is null then raise exception 'not found' using errcode = '42501'; end if;
  override := not public.has_role(d.workspace_id, 'client_owner');
  if override and not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if d.status <> 'in_review' then raise exception 'not in review' using errcode = '23514'; end if;
  select max(n) into v from public.deliverable_version where deliverable_id = p_id;
  if p_decision = 'approve' then
    if p_version is null or v is null or p_version <> v then raise exception 'newer version: reload and review it first' using errcode = '23514'; end if;
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
revoke all on function public.deliverable_submit(uuid), public.deliverable_decide(uuid, text, text, int) from public, anon;
grant execute on function public.deliverable_submit(uuid), public.deliverable_decide(uuid, text, text, int) to authenticated;

-- 5. Stage 3 needs profile and messages both approved. Serialise per workspace so two approvals at once still unlock it.
create or replace function public.invoice_unlock() returns trigger
language plpgsql security definer set search_path = public as $$
declare st int;
begin
  if new.status <> 'approved' or old.status = 'approved' then return new; end if;
  perform 1 from public.workspace where id = new.workspace_id for update;
  if new.kind = 'icp' then
    st := 2;
  elsif new.kind in ('profile','dm_sequence')
    and exists (select 1 from public.deliverable where workspace_id = new.workspace_id and kind = 'profile' and status = 'approved')
    and exists (select 1 from public.deliverable where workspace_id = new.workspace_id and kind = 'dm_sequence' and status = 'approved') then
    st := 3;
  end if;
  if st is not null then
    insert into public.invoice (workspace_id, stage) values (new.workspace_id, st) on conflict do nothing;
    if found then
      insert into public.event_log (workspace_id, actor, action, detail)
        values (new.workspace_id, auth.uid(), 'invoice.unlocked', jsonb_build_object('stage', st, 'deliverable', new.id));
    end if;
  end if;
  return new;
end $$;
