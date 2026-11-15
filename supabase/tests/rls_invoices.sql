-- Tests for invoices: unlock on approval, no ahead-of-work billing, RLS. Rolled back. Prints 'RLS invoice tests passed'.
begin;
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000a5','a5@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000b5','b5@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000d5','lead5@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
insert into public.workspace (id, company, plan, payment_provider, payment_id) values
  ('50000000-0000-0000-0000-00000000000a','Agency A5','starter','whop','pay_test_a5'),
  ('50000000-0000-0000-0000-00000000000b','Agency B5','pro',null,null);
insert into public.membership values
  ('50000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a5','client_owner'),
  ('50000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000b5','client_owner'),
  ('50000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000d5','delivery_lead');
insert into public.deliverable (id, workspace_id, kind, title) values
  ('51000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-00000000000a','icp','ICP'),
  ('51000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-00000000000a','profile','Profile'),
  ('51000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-00000000000a','dm_sequence','Messages');
insert into public.deliverable_version (deliverable_id, n, workspace_id, content) values
  ('51000000-0000-0000-0000-000000000001',1,'50000000-0000-0000-0000-00000000000a','x'),
  ('51000000-0000-0000-0000-000000000002',1,'50000000-0000-0000-0000-00000000000a','x'),
  ('51000000-0000-0000-0000-000000000003',1,'50000000-0000-0000-0000-00000000000a','x');

do $$
declare n int; ok boolean;
begin
  -- Stage 1 starts paid for a workspace created from a payment; B (no payment) has none.
  select count(*) into n from public.invoice where workspace_id = '50000000-0000-0000-0000-00000000000a' and stage = 1 and paid_at is not null; assert n = 1, 'stage 1 paid';
  select count(*) into n from public.invoice where workspace_id = '50000000-0000-0000-0000-00000000000b'; assert n = 0, 'no invoice without payment';

  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000d5","role":"authenticated"}',true);
  perform public.deliverable_submit('51000000-0000-0000-0000-000000000001'); -- ICP
  select count(*) into n from public.invoice where stage > 1; assert n = 0, 'sending the ICP bills nothing';
  perform public.deliverable_submit('51000000-0000-0000-0000-000000000003'); -- DM sequences first
  select count(*) into n from public.invoice where stage > 1; assert n = 0, 'DM sequences before the profile bill nothing (never out of order)';
  perform public.deliverable_submit('51000000-0000-0000-0000-000000000002'); -- profile
  select count(*) into n from public.invoice where stage = 2 and paid_at is null; assert n = 1, 'sending the profile creates the stage 2 invoice';
  select count(*) into n from public.invoice where stage = 3 and paid_at is null; assert n = 1, 'and stage 3 too, since the DM sequences were already sent';
  select count(*) into n from public.event_log where action = 'invoice.unlocked'; assert n = 2, 'each unlock is logged once';
  select count(*) into n from public.deliverable where workspace_id = '50000000-0000-0000-0000-00000000000a' and status = 'in_review'; assert n = 3, 'all three were sent';

  -- The client approving the ICP changes nothing about billing.
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}',true);
  perform public.deliverable_decide('51000000-0000-0000-0000-000000000001','approve',null,1);
  select count(*) into n from public.invoice where stage > 1; assert n = 2, 'approving does not create or remove invoices';
  select count(*) into n from public.event_log where action = 'invoice.unlocked'; assert n = 2, 'no extra unlock entries';

  -- Clients cannot create, edit or delete invoices.
  ok := false;
  begin insert into public.invoice (workspace_id, stage) values ('50000000-0000-0000-0000-00000000000a', 3); exception when others then ok := true; end;
  assert ok, 'no client insert';
  ok := false;
  begin update public.invoice set paid_at = now() where stage = 2; exception when others then ok := true; end;
  assert ok, 'client cannot mark an invoice paid';
  ok := false;
  begin delete from public.invoice; exception when others then ok := true; end;
  assert ok, 'no client delete';
  ok := false;
  begin update public.invoice set charge_attempts = 0, charge_error = null where stage = 2; exception when others then ok := true; end;
  assert ok, 'client cannot touch the charge tracking';
  ok := false;
  begin perform count(*) from public.billing_account; exception when others then ok := true; end;
  assert ok, 'client cannot read the saved card ids';

  -- Visibility
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000d5","role":"authenticated"}',true);
  select count(*) into n from public.invoice; assert n = 3, format('lead reads A invoices, saw %s', n);
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b5","role":"authenticated"}',true);
  select count(*) into n from public.invoice; assert n = 0, 'B must not read A invoices';
  reset role; set local role anon; perform set_config('request.jwt.claims','{}',true);
  begin select count(*) into n from public.invoice; assert n = 0, 'anon sees nothing'; exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'RLS invoice tests passed' as result;
