-- Tests for admin billing controls. Rolled back. Prints 'admin billing tests passed'.
begin;
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000a9','a9@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000e9','admin9@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
update public.app_user set is_admin = true where id = '00000000-0000-0000-0000-0000000000e9';
insert into public.workspace (id, company, plan, payment_provider, payment_id) values
  ('90000000-0000-0000-0000-00000000000a','Agency A9','pro','whop','pay_test_a9'),
  ('90000000-0000-0000-0000-00000000000b','Agency B9','pro',null,null);
insert into public.membership values
  ('90000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a9','client_owner'),
  ('90000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000a9','client_owner');
insert into public.invoice (workspace_id, stage, amount_cents, pay_url) values ('90000000-0000-0000-0000-00000000000a', 2, 75000, 'https://pay.example/old');

do $$
declare ok boolean; p int[]; inv record; n int; tu timestamptz;
begin
  set local role authenticated;

  -- A client can use none of the controls, nor edit the columns directly.
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a9","role":"authenticated"}',true);
  ok := false; begin perform public.admin_set_stage_price('90000000-0000-0000-0000-00000000000a', 2, 100); exception when others then ok := true; end;
  assert ok, 'client cannot change a price';
  ok := false; begin perform public.admin_waive_stage('90000000-0000-0000-0000-00000000000b', 1, 'free'); exception when others then ok := true; end;
  assert ok, 'client cannot waive a stage';
  ok := false; begin perform public.admin_set_trial('90000000-0000-0000-0000-00000000000b', now() + interval '7 days'); exception when others then ok := true; end;
  assert ok, 'client cannot give a trial';
  ok := false; begin update public.workspace set trial_until = now() + interval '30 days'; exception when others then ok := true; end;
  select count(*) into n from public.workspace where trial_until is not null; assert ok or n = 0, 'client cannot set a trial directly';

  -- Admin: a discount resets the unpaid stage 2 so it gets a new price and link.
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000e9","role":"authenticated"}',true);
  perform public.admin_set_stage_price('90000000-0000-0000-0000-00000000000a', 2, 60000);
  select stage_price_cents into p from public.workspace where id = '90000000-0000-0000-0000-00000000000a';
  assert p[2] = 60000 and p[1] is null and p[3] is null, 'custom price stored for stage 2 only';
  select * into inv from public.invoice where workspace_id = '90000000-0000-0000-0000-00000000000a' and stage = 2;
  assert inv.pay_url is null and inv.amount_cents is null, 'old link and amount cleared';
  ok := false; begin perform public.admin_set_stage_price('90000000-0000-0000-0000-00000000000a', 2, 0); exception when others then ok := true; end;
  assert ok, 'zero is not a price (waive instead)';
  ok := false; begin perform public.admin_set_stage_price('90000000-0000-0000-0000-00000000000a', 1, 20000); exception when others then ok := true; end;
  assert ok, 'a paid stage keeps its price';
  perform public.admin_set_stage_price('90000000-0000-0000-0000-00000000000a', 2, null);
  select stage_price_cents into p from public.workspace where id = '90000000-0000-0000-0000-00000000000a';
  assert p is null, 'reset back to the plan price';

  -- A charge in flight cannot be changed or waived.
  reset role;
  update public.invoice set charge_attempted_at = now() where workspace_id = '90000000-0000-0000-0000-00000000000a' and stage = 2;
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000e9","role":"authenticated"}',true);
  ok := false; begin perform public.admin_waive_stage('90000000-0000-0000-0000-00000000000a', 2, 'goodwill'); exception when others then ok := true; end;
  assert ok, 'no waiver while a charge is in flight';

  -- Waive stage 1 of an unpaid workspace: it counts as paid, with no money.
  ok := false; begin perform public.admin_waive_stage('90000000-0000-0000-0000-00000000000b', 1, ' '); exception when others then ok := true; end;
  assert ok, 'a reason is required';
  perform public.admin_waive_stage('90000000-0000-0000-0000-00000000000b', 1, 'Pilot client');
  select * into inv from public.invoice where workspace_id = '90000000-0000-0000-0000-00000000000b' and stage = 1;
  assert inv.paid_at is not null and inv.waived and inv.amount_cents = 0, 'stage 1 waived';
  ok := false; begin perform public.admin_waive_stage('90000000-0000-0000-0000-00000000000b', 1, 'again'); exception when others then ok := true; end;
  assert ok, 'cannot waive twice';

  -- Trial: within 90 days, and can be ended.
  perform public.admin_set_trial('90000000-0000-0000-0000-00000000000b', now() + interval '14 days');
  select trial_until into tu from public.workspace where id = '90000000-0000-0000-0000-00000000000b'; assert tu > now(), 'trial set';
  ok := false; begin perform public.admin_set_trial('90000000-0000-0000-0000-00000000000b', now() + interval '200 days'); exception when others then ok := true; end;
  assert ok, 'no trial longer than 90 days';
  perform public.admin_set_trial('90000000-0000-0000-0000-00000000000b', null);
  select trial_until into tu from public.workspace where id = '90000000-0000-0000-0000-00000000000b'; assert tu is null, 'trial ended';

  select count(*) into n from public.event_log where action like 'billing.%'; assert n = 5, format('every change is logged, saw %s', n);
end $$;
rollback;
select 'admin billing tests passed' as result;
