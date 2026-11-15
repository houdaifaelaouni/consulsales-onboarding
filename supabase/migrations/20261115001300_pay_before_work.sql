-- Pay before the work. Stage 1 opens the workspace. The ideal client profile (ICP) being approved bills stage 2; the LinkedIn
-- profile being approved bills stage 3. A deliverable cannot be sent to the client until the stage it belongs to is paid.

create or replace function public.invoice_unlock() returns trigger
language plpgsql security definer set search_path = public as $$
declare st int;
begin
  if new.status <> 'approved' or old.status = 'approved' then return new; end if;
  st := case new.kind when 'icp' then 2 when 'profile' then 3 else null end;
  if st is null then return new; end if;
  perform 1 from public.workspace where id = new.workspace_id for update;
  insert into public.invoice (workspace_id, stage) values (new.workspace_id, st) on conflict do nothing;
  if found then
    insert into public.event_log (workspace_id, actor, action, detail)
      values (new.workspace_id, auth.uid(), 'invoice.unlocked', jsonb_build_object('stage', st, 'deliverable', new.id));
  end if;
  return new;
end $$;

create or replace function public.deliverable_submit(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d public.deliverable; need int;
begin
  select * into d from public.deliverable where id = p_id for update;
  if d.id is null or not (public.has_role(d.workspace_id, 'delivery_lead') or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if d.status not in ('draft','changes_requested') then raise exception 'cannot submit from %', d.status using errcode = '23514'; end if;
  if not exists (select 1 from public.deliverable_version where deliverable_id = p_id) then raise exception 'no version to review' using errcode = '23514'; end if;
  -- No delivery without payment: the ICP needs stage 1, the profile stage 2, the DM sequences stage 3.
  need := case d.kind when 'profile' then 2 when 'dm_sequence' then 3 else 1 end;
  if not exists (select 1 from public.invoice where workspace_id = d.workspace_id and stage = need and paid_at is not null) then
    raise exception 'payment required: stage % is not paid', need using errcode = '23514';
  end if;
  update public.deliverable set status = 'in_review', change_note = null where id = p_id;
  insert into public.event_log (workspace_id, actor, action, detail)
    values (d.workspace_id, auth.uid(), 'deliverable.submitted', jsonb_build_object('deliverable', p_id, 'kind', d.kind));
end $$;
revoke all on function public.deliverable_submit(uuid) from public, anon;
grant execute on function public.deliverable_submit(uuid) to authenticated;
