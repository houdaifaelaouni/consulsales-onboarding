-- Tests for agency_usage. Rolled back. Prints 'agency usage tests passed'.
begin;
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000b1','b1@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000b2','b2@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
insert into public.agency (id, name, tier) values
  ('c1000000-0000-0000-0000-00000000000a','Agency UA','starter'),
  ('c1000000-0000-0000-0000-00000000000b','Agency UB','starter');
insert into public.agency_member values
  ('c1000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000b1','owner'),
  ('c1000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000b2','owner');
insert into public.workspace (company, plan, agency_id) values
  ('UA room 1','pro','c1000000-0000-0000-0000-00000000000a'),
  ('UA room 2','pro','c1000000-0000-0000-0000-00000000000a'),
  ('UB room 1','pro','c1000000-0000-0000-0000-00000000000b');

do $$
declare n int; ok boolean;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}',true);
  n := public.agency_usage('c1000000-0000-0000-0000-00000000000a'); assert n = 2, 'member reads own agency usage';
  n := public.agency_usage('c1000000-0000-0000-0000-00000000000b'); assert n is null, 'member gets nothing for another agency';
  ok := false; begin perform public.agency_rooms_used('c1000000-0000-0000-0000-00000000000b'); exception when insufficient_privilege then ok := true; end;
  assert ok, 'raw counter is not callable by a signed-in user';
  reset role;
end $$;
rollback;
select 'agency usage tests passed' as result;
