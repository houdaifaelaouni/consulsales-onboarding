-- Tests for agency rooms. Rolled back. Prints 'agency room tests passed'.
begin;
insert into public.agency (id, name, tier) values ('d1000000-0000-0000-0000-00000000000a','Agency RA','starter');
insert into public.workspace (id, company, plan, agency_id) values
  ('d2000000-0000-0000-0000-00000000000a','Room RA','pro','d1000000-0000-0000-0000-00000000000a');
insert into public.workspace (id, company, plan) values ('d2000000-0000-0000-0000-00000000000b','Direct RB','pro');

do $$
declare n int; w int;
begin
  select count(*), count(*) filter (where paid_at is not null and waived and amount_cents = 0) into n, w
    from public.invoice where workspace_id = 'd2000000-0000-0000-0000-00000000000a';
  assert n = 3 and w = 3, 'an agency room gets its three stage invoices paid and waived';
  select count(*) into n from public.invoice where workspace_id = 'd2000000-0000-0000-0000-00000000000b' and waived;
  assert n = 0, 'a direct ConsulSales client is not waived';
end $$;
rollback;
select 'agency room tests passed' as result;
