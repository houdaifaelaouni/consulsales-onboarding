-- Tests for the identity lockdown. Rolled back. Prints 'identity tests passed'.
begin;
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000a8','a8@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000b8','b8@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated');

do $$
declare n int; ok boolean; u uuid; e text;
begin
  -- the profile is created in lower case from the auth email
  select email into e from public.app_user where id = '00000000-0000-0000-0000-0000000000a8'; assert e = 'a8@test.dev', 'profile created';

  -- a user can change only name and locale
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a8","role":"authenticated"}',true);
  update public.app_user set name = 'Eight' where id = '00000000-0000-0000-0000-0000000000a8';
  get diagnostics n = row_count; assert n = 1, 'name can be edited';
  update public.app_user set locale = 'fr' where id = '00000000-0000-0000-0000-0000000000a8';
  get diagnostics n = row_count; assert n = 1, 'locale can be edited';
  ok := false; begin update public.app_user set email = 'b8@test.dev' where id = '00000000-0000-0000-0000-0000000000a8'; exception when others then ok := true; end;
  assert ok, 'email cannot be edited';
  ok := false; begin update public.app_user set is_admin = true where id = '00000000-0000-0000-0000-0000000000a8'; exception when others then ok := true; end;
  assert ok, 'is_admin cannot be edited';
  reset role;

  -- one profile per email
  ok := false; begin insert into public.app_user (id, email) values (gen_random_uuid(), 'A8@Test.dev'); exception when others then ok := true; end;
  assert ok, 'duplicate email (any case) is refused';

  -- the profile follows the real account email
  update auth.users set email = 'a8-new@test.dev' where id = '00000000-0000-0000-0000-0000000000a8';
  select email into e from public.app_user where id = '00000000-0000-0000-0000-0000000000a8'; assert e = 'a8-new@test.dev', 'profile email follows auth';
  update auth.users set email = 'a8@test.dev' where id = '00000000-0000-0000-0000-0000000000a8';

  -- the PIN is found by the real account email, not by whatever the profile says
  perform public.pin_set('00000000-0000-0000-0000-0000000000a8', '482915');
  update public.app_user set email = 'zzz@test.dev' where id = '00000000-0000-0000-0000-0000000000a8'; -- as the database owner, simulating a tampered profile
  u := public.pin_verify('a8@test.dev', '482915'); assert u = '00000000-0000-0000-0000-0000000000a8', 'real email still works';
  assert public.pin_verify('zzz@test.dev', '482915') is null, 'a tampered profile email cannot be used to sign in';
  assert public.pin_verify('b8@test.dev', '482915') is null, 'another person''s email does not match this PIN';
end $$;
rollback;
select 'identity tests passed' as result;
