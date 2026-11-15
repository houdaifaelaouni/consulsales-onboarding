-- Backend slice 6: stage invoices. "You never pay ahead of the work": stage 2 and 3 rows are created
-- by the database itself when the matching deliverables are approved. A missing row means locked.
create table public.invoice (
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  stage int not null check (stage between 1 and 3),
  amount_cents int check (amount_cents is null or amount_cents >= 0),
  currency text not null default 'eur' check (length(currency) = 3),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  provider_invoice_id text,
  pay_url text check (pay_url is null or pay_url like 'https://%'),
  pdf_url text check (pdf_url is null or pdf_url like 'https://%'),
  primary key (workspace_id, stage)
);
alter table public.invoice enable row level security;
create policy invoice_select on public.invoice for select to authenticated
  using (public.is_member(workspace_id) or public.is_admin());
-- No write policies and no write grants: only the triggers below and the server (service role) change invoices.
revoke insert, update, delete, truncate on public.invoice from authenticated, anon;

-- Stage 1 is paid at checkout, so a workspace created from a payment starts with it paid.
create function public.invoice_stage1() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.payment_id is not null then
    insert into public.invoice (workspace_id, stage, created_at, paid_at) values (new.id, 1, new.created_at, new.created_at)
      on conflict do nothing;
  end if;
  return new;
end $$;
create trigger workspace_invoice_stage1 after insert or update of payment_id on public.workspace
  for each row execute function public.invoice_stage1();
insert into public.invoice (workspace_id, stage, created_at, paid_at)
  select id, 1, created_at, created_at from public.workspace where payment_id is not null on conflict do nothing;

-- Approving the ICP unlocks stage 2. Approving the profile and the first messages unlocks stage 3.
create function public.invoice_unlock() returns trigger
language plpgsql security definer set search_path = public as $$
declare st int;
begin
  if new.status <> 'approved' or old.status = 'approved' then return new; end if;
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
create trigger deliverable_invoice_unlock after update of status on public.deliverable
  for each row execute function public.invoice_unlock();
