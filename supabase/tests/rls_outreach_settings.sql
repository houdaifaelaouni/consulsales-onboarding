-- Tests for outreach settings and their hard limits. Rolled back. Prints 'outreach settings tests passed'.
begin;
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000c5','c5@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000c6','c6@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000e5','admin5@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
update public.app_user set is_admin = true where id = '00000000-0000-0000-0000-0000000000e5';
insert into public.workspace (id, company, plan) values
  ('e2000000-0000-0000-0000-00000000000a','Settings A','pro'),
  ('e2000000-0000-0000-0000-00000000000b','Settings B','pro');
insert into public.membership values
  ('e2000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000c5','client_owner'),
  ('e2000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000c6','client_owner');

do $$
declare n int; ok boolean; s record; ws constant uuid := 'e2000000-0000-0000-0000-00000000000a';
begin
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000c5","role":"authenticated"}',true);

  perform public.outreach_settings_save(ws, 20, 40, '09:00', '17:00', 'Europe/Madrid', true, true);
  select * into s from public.outreach_settings where workspace_id = ws;
  assert s.invites_per_day = 20 and s.messages_per_day = 40 and s.paused, 'owner saves limits and a new workspace starts paused';

  -- hard limits
  ok := false; begin perform public.outreach_settings_save(ws, 31, 40, '09:00', '17:00', 'Europe/Madrid', true, true); exception when others then ok := true; end;
  assert ok, 'more than 30 invitations a day is refused';
  ok := false; begin perform public.outreach_settings_save(ws, 20, 51, '09:00', '17:00', 'Europe/Madrid', true, true); exception when others then ok := true; end;
  assert ok, 'more than 50 messages a day is refused';
  ok := false; begin perform public.outreach_settings_save(ws, 20, 40, '05:00', '17:00', 'Europe/Madrid', true, true); exception when others then ok := true; end;
  assert ok, 'working hours before 06:00 are refused';
  ok := false; begin perform public.outreach_settings_save(ws, 20, 40, '09:00', '23:00', 'Europe/Madrid', true, true); exception when others then ok := true; end;
  assert ok, 'working hours after 22:00 are refused';
  ok := false; begin perform public.outreach_settings_save(ws, 20, 40, '17:00', '09:00', 'Europe/Madrid', true, true); exception when others then ok := true; end;
  assert ok, 'an end before the start is refused';
  ok := false; begin perform public.outreach_settings_save(ws, 20, 40, '09:00', '17:00', 'Mars/Olympus', true, true); exception when others then ok := true; end;
  assert ok, 'an unknown timezone is refused';
  ok := false; begin perform public.outreach_settings_save(ws, -1, 40, '09:00', '17:00', 'Europe/Madrid', true, true); exception when others then ok := true; end;
  assert ok, 'a negative limit is refused';

  -- the client cannot write the table or save for someone else
  ok := false; begin update public.outreach_settings set invites_per_day = 99; exception when others then ok := true; end;
  assert ok, 'no direct writes';
  ok := false; begin perform public.outreach_settings_save('e2000000-0000-0000-0000-00000000000b', 20, 40, '09:00', '17:00', 'Europe/Madrid', true, true); exception when others then ok := true; end;
  assert ok, 'cannot save for another workspace';
  select count(*) into n from public.outreach_settings; assert n = 1, 'sees only own settings';

  -- resuming needs the risk notice and a connected account
  ok := false; begin perform public.outreach_set_paused(ws, false); exception when others then ok := true; end;
  assert ok, 'cannot resume without accepting the notice';
  insert into public.outreach_consent (workspace_id, user_id, notice_version) values (ws, '00000000-0000-0000-0000-0000000000c5', 'v1');
  ok := false; begin perform public.outreach_set_paused(ws, false); exception when others then ok := true; end;
  assert ok, 'cannot resume without a connected account';

  -- the client cannot use the admin kill switch
  ok := false; begin perform public.outreach_admin_stop(ws, true, 'x'); exception when others then ok := true; end;
  assert ok, 'client cannot stop with the admin switch';
  reset role;

  -- a connected account lets the owner resume; the admin stops it for good
  insert into public.outreach_account (workspace_id, unipile_account_id, status) values (ws, 'acc_s1', 'ok');
  set local role authenticated;
  perform public.outreach_set_paused(ws, false);
  select * into s from public.outreach_settings where workspace_id = ws; assert not s.paused, 'owner resumes';
  perform public.outreach_set_paused(ws, true);
  select * into s from public.outreach_settings where workspace_id = ws; assert s.paused, 'owner pauses';
  reset role;

  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}',true);
  ok := false; begin perform public.outreach_admin_stop(ws, true, ''); exception when others then ok := true; end;
  assert ok, 'a stop needs a reason';
  perform public.outreach_admin_stop(ws, true, 'restriction warning');
  select * into s from public.outreach_settings where workspace_id = ws; assert s.admin_stopped and s.admin_stop_reason = 'restriction warning', 'admin stops sending';
  perform public.outreach_admin_stop(ws, false, null);
  select * into s from public.outreach_settings where workspace_id = ws; assert not s.admin_stopped and s.admin_stop_reason is null, 'admin releases';
  reset role;
end $$;
rollback;
select 'outreach settings tests passed' as result;
