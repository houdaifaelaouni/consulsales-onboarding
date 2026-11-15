-- Payments follow the website: stage 2 is charged when the profile is visible to the client (day 7), stage 3 when the DM
-- sequences are (day 14) ("only charged once you can see the work they cover"), not when the client approves.
-- Also: where the buyer's saved card is remembered so later stages can be charged automatically.

-- The saved payment method belongs to the server only (no policies, no grants). Not even the client can read it.
create table public.billing_account (
  workspace_id uuid primary key references public.workspace (id) on delete cascade,
  member_id text not null,
  payment_method_id text not null,
  saved_at timestamptz not null default now()
);
alter table public.billing_account enable row level security;
revoke all on public.billing_account from anon, authenticated;

-- Stage 2: the profile is sent to the client. Stage 3: the DM sequences are sent, and stage 2 already exists (never out of order).
create or replace function public.invoice_unlock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'in_review' or old.status = 'in_review' then return new; end if;
  if new.kind not in ('profile', 'dm_sequence') then return new; end if;
  perform 1 from public.workspace where id = new.workspace_id for update;

  if new.kind = 'profile' then
    insert into public.invoice (workspace_id, stage) values (new.workspace_id, 2) on conflict do nothing;
    if found then
      insert into public.event_log (workspace_id, actor, action, detail)
        values (new.workspace_id, auth.uid(), 'invoice.unlocked', jsonb_build_object('stage', 2, 'deliverable', new.id));
    end if;
  end if;

  if exists (select 1 from public.invoice where workspace_id = new.workspace_id and stage = 2)
     and exists (select 1 from public.deliverable where workspace_id = new.workspace_id and kind = 'dm_sequence' and status <> 'draft') then
    insert into public.invoice (workspace_id, stage) values (new.workspace_id, 3) on conflict do nothing;
    if found then
      insert into public.event_log (workspace_id, actor, action, detail)
        values (new.workspace_id, auth.uid(), 'invoice.unlocked', jsonb_build_object('stage', 3, 'deliverable', new.id));
    end if;
  end if;
  return new;
end $$;
