-- Tests for agencies, tiers and the room limit. Rolled back. Prints 'agency tests passed'.
begin;
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000f1','f1@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000f2','f2@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
insert into public.agency (id, name, tier) values
  ('b1000000-0000-0000-0000-00000000000a','Agency A','free'),
  ('b1000000-0000-0000-0000-00000000000b','Agency B','free');
insert into public.agency_member values
  ('b1000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000f1','owner'),
  ('b1000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000f2','owner');

do $$
declare n int; ok boolean;
begin
  -- Free tier: one room in total, the second is refused.
  insert into public.workspace (company, plan, agency_id) values ('Room 1','pro','b1000000-0000-0000-0000-00000000000a');
  ok := false; begin insert into public.workspace (company, plan, agency_id) values ('Room 2','pro','b1000000-0000-0000-0000-00000000000a'); exception when check_violation then ok := true; end;
  assert ok, 'free tier refuses a second room';

  -- Another agency has its own count.
  insert into public.workspace (company, plan, agency_id) values ('B Room 1','pro','b1000000-0000-0000-0000-00000000000b');

  -- Workspaces with no agency (ConsulSales direct clients) are never limited.
  insert into public.workspace (company, plan) values ('Direct 1','pro'), ('Direct 2','pro');

  -- Upgrade to starter (3 per month): rooms from last month do not count, this month's do.
  update public.agency set tier = 'starter' where id = 'b1000000-0000-0000-0000-00000000000a';
  update public.workspace set created_at = now() - interval '40 days' where company = 'Room 1';
  insert into public.workspace (company, plan, agency_id) values ('Room 2','pro','b1000000-0000-0000-0000-00000000000a'), ('Room 3','pro','b1000000-0000-0000-0000-00000000000a'), ('Room 4','pro','b1000000-0000-0000-0000-00000000000a');
  ok := false; begin insert into public.workspace (company, plan, agency_id) values ('Room 5','pro','b1000000-0000-0000-0000-00000000000a'); exception when check_violation then ok := true; end;
  assert ok, 'starter tier refuses a fourth room in one month';

  -- A member sees only their own agency and its rooms, and cannot change tier.
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}',true);
  select count(*) into n from public.agency; assert n = 1, 'member sees only own agency';
  select count(*) into n from public.workspace where agency_id = 'b1000000-0000-0000-0000-00000000000b'; assert n = 0, 'member does not see another agency''s rooms';
  select count(*) into n from public.workspace where agency_id = 'b1000000-0000-0000-0000-00000000000a'; assert n = 4, 'member sees own agency rooms';
  ok := false; begin update public.agency set tier = 'scale'; exception when others then ok := true; end;
  select count(*) into n from public.agency where tier = 'scale'; assert ok or n = 0, 'member cannot change tier';
  ok := false; begin insert into public.agency (name, tier) values ('Rogue','scale'); exception when others then ok := true; end;
  assert ok, 'member cannot create an agency';
  reset role;
end $$;
rollback;
select 'agency tests passed' as result;
