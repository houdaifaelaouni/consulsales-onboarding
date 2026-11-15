-- Backend slice 8: onboarding tasks follow what actually happened, so the client home and admin board stay true.
create function public.task_type_for_access(item text) returns text
language sql immutable as $$
  select case item when 'linkedin' then 'connect_linkedin' when 'crm' then 'connect_crm' when 'brand' then 'upload_brand_files' end
$$;

create function public.task_type_for_deliverable(kind text) returns text
language sql immutable as $$
  select case kind when 'icp' then 'approve_icp' when 'profile' then 'approve_profile' when 'dm_sequence' then 'approve_sequences' end
$$;

create function public.task_sync_access() returns trigger
language plpgsql security definer set search_path = public as $$
declare tt text := public.task_type_for_access(new.item_id);
begin
  if tt is not null then
    update public.task set status = case new.status when 'connected' then 'done' when 'blocked' then 'blocked' else 'todo' end::public.task_status
      where workspace_id = new.workspace_id and type = tt;
  end if;
  return new;
end $$;
create trigger access_item_task_sync after insert or update of status on public.access_item
  for each row execute function public.task_sync_access();

create function public.task_sync_deliverable() returns trigger
language plpgsql security definer set search_path = public as $$
declare tt text := public.task_type_for_deliverable(new.kind);
begin
  if new.status = 'approved' and old.status <> 'approved' and tt is not null then
    update public.task set status = 'done' where workspace_id = new.workspace_id and type = tt;
  end if;
  return new;
end $$;
create trigger deliverable_task_sync after update of status on public.deliverable
  for each row execute function public.task_sync_deliverable();
