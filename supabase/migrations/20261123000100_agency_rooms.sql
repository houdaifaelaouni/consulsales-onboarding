-- A client room opened by an agency is not a ConsulSales stage-payment client: the agency runs its own commercial terms.
-- So its three stage invoices start out paid and waived (amount 0). That opens the workspace and lets work be sent for review
-- through the existing checks, with no change to them, and no charge is ever attempted.

create function public.agency_room_waive_billing() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.invoice (workspace_id, stage, created_at, paid_at, waived, amount_cents)
    select new.id, s, now(), now(), true, 0 from generate_series(1, 3) s
  on conflict do nothing;
  return null;
end $$;

create trigger workspace_agency_billing after insert on public.workspace
  for each row when (new.agency_id is not null) execute function public.agency_room_waive_billing();
