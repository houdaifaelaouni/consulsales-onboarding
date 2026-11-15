-- Tests for the PIN login: hashing, lockout, no access for clients. Rolled back. Prints 'PIN tests passed'.
begin;
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000a7','a7@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000b7','b7@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated');

do $$
declare u uuid; h text; t int; lu timestamptz; ok boolean;
begin
  perform public.pin_set('00000000-0000-0000-0000-0000000000a7', '482915');
  select pin_hash into h from public.user_pin where user_id = '00000000-0000-0000-0000-0000000000a7';
  assert h <> '482915' and h like '$2%', 'the PIN is stored as a bcrypt hash, never plain';
  assert public.pin_exists('00000000-0000-0000-0000-0000000000a7'), 'pin_exists true';
  assert not public.pin_exists('00000000-0000-0000-0000-0000000000b7'), 'pin_exists false without a PIN';

  -- right PIN, any email casing
  u := public.pin_verify('A7@Test.dev', '482915'); assert u = '00000000-0000-0000-0000-0000000000a7', 'correct PIN signs in';
  -- unknown email and an account without a PIN fail the same way
  assert public.pin_verify('nobody@test.dev', '482915') is null, 'unknown email fails';
  assert public.pin_verify('b7@test.dev', '482915') is null, 'account without a PIN fails';

  -- four wrong tries do not lock, a right one resets the counter
  for i in 1..4 loop assert public.pin_verify('a7@test.dev', '000000') is null, 'wrong PIN fails'; end loop;
  select failed_tries into t from public.user_pin where user_id = '00000000-0000-0000-0000-0000000000a7'; assert t = 4, 'four failures counted';
  assert public.pin_verify('a7@test.dev', '482915') is not null, 'still works before the lock';
  select failed_tries into t from public.user_pin where user_id = '00000000-0000-0000-0000-0000000000a7'; assert t = 0, 'success resets the counter';
  assert public.pin_verify('a7@test.dev', 'abcdef') is null, 'non-digit PIN fails';

  -- five wrong tries lock it, even the right PIN fails while locked
  for i in 1..5 loop perform public.pin_verify('a7@test.dev', '111111'); end loop;
  select locked_until into lu from public.user_pin where user_id = '00000000-0000-0000-0000-0000000000a7';
  assert lu > now() + interval '14 minutes', 'locked for about 15 minutes';
  assert public.pin_verify('a7@test.dev', '482915') is null, 'right PIN fails while locked';

  -- lock expires
  update public.user_pin set locked_until = now() - interval '1 second' where user_id = '00000000-0000-0000-0000-0000000000a7';
  assert public.pin_verify('a7@test.dev', '482915') is not null, 'works again after the lock expires';

  -- format and clearing
  ok := false; begin perform public.pin_set('00000000-0000-0000-0000-0000000000a7', '12345'); exception when others then ok := true; end;
  assert ok, 'five digits is rejected';
  perform public.pin_clear('00000000-0000-0000-0000-0000000000a7');
  assert not public.pin_exists('00000000-0000-0000-0000-0000000000a7'), 'PIN removed';

  -- clients and anonymous visitors cannot touch any of it
  perform public.pin_set('00000000-0000-0000-0000-0000000000a7', '482915');
  set local role authenticated;
  ok := false; begin perform public.pin_verify('a7@test.dev', '482915'); exception when others then ok := true; end;
  assert ok, 'authenticated cannot call pin_verify';
  ok := false; begin perform public.pin_set('00000000-0000-0000-0000-0000000000a7', '999999'); exception when others then ok := true; end;
  assert ok, 'authenticated cannot call pin_set';
  ok := false; begin perform count(*) from public.user_pin; exception when others then ok := true; end;
  assert ok, 'authenticated cannot read the table';
  reset role; set local role anon;
  ok := false; begin perform public.pin_verify('a7@test.dev', '482915'); exception when others then ok := true; end;
  assert ok, 'anon cannot call pin_verify';
end $$;
rollback;
select 'PIN tests passed' as result;
