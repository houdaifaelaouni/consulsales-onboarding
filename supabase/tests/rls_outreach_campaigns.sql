-- Tests for outreach campaigns. Rolled back. Prints 'outreach campaigns tests passed'.
begin;
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000c9','c9@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000d1','d1@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
insert into public.workspace (id, company, plan) values
  ('e4000000-0000-0000-0000-00000000000a','Camp A','pro'),
  ('e4000000-0000-0000-0000-00000000000b','Camp B','pro');
insert into public.membership values
  ('e4000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000c9','client_owner'),
  ('e4000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000d1','client_owner');
insert into public.outreach_lead (id, workspace_id, full_name, linkedin_key, linkedin_url, status) values
  ('e5000000-0000-0000-0000-000000000001','e4000000-0000-0000-0000-00000000000a','Ana','ana','u1','approved'),
  ('e5000000-0000-0000-0000-000000000002','e4000000-0000-0000-0000-00000000000a','Marc','marc','u2','approved'),
  ('e5000000-0000-0000-0000-000000000003','e4000000-0000-0000-0000-00000000000a','Sofia','sofia','u3','new');

do $$
declare cid uuid; n int; ok boolean; wa constant uuid := 'e4000000-0000-0000-0000-00000000000a'; wb constant uuid := 'e4000000-0000-0000-0000-00000000000b'; st text;
  steps constant jsonb := '[{"body":"Hi {first_name}"},{"delay_days":1,"body":"Thanks for connecting"},{"delay_days":3,"body":"Follow-up"}]';
begin
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000c9","role":"authenticated"}',true);

  cid := public.outreach_campaign_save(wa, null, 'First campaign', steps);
  select count(*) into n from public.outreach_step where campaign_id = cid; assert n = 3, 'steps saved';
  select count(*) into n from public.outreach_step where campaign_id = cid and kind = 'invite' and position = 0; assert n = 1, 'the first step is the connection request';

  perform public.outreach_campaign_save(wa, cid, 'Renamed', '[{"body":""},{"delay_days":2,"body":"Only message"}]');
  select count(*) into n from public.outreach_step where campaign_id = cid; assert n = 2, 'a draft can be rewritten';

  ok := false; begin perform public.outreach_campaign_save(wa, null, 'x', '[{"body":"only one step"}]'); exception when others then ok := true; end;
  assert ok, 'needs a request and at least one message';
  ok := false; begin perform public.outreach_campaign_save(wa, null, 'x', ('[{"body":"' || repeat('a', 301) || '"},{"body":"m"}]')::jsonb); exception when others then ok := true; end;
  assert ok, 'a connection note over 300 characters is refused';
  ok := false; begin perform public.outreach_campaign_save(wa, null, 'x', '[{"body":""},{"body":""}]'); exception when others then ok := true; end;
  assert ok, 'an empty message is refused';
  ok := false; begin perform public.outreach_campaign_save(wa, null, 'x', '[{"body":""},{"delay_days":31,"body":"m"}]'); exception when others then ok := true; end;
  assert ok, 'a delay over 30 days is refused';
  ok := false; begin perform public.outreach_campaign_save(wb, null, 'x', steps); exception when others then ok := true; end;
  assert ok, 'cannot create in another workspace';

  n := public.outreach_campaign_launch(wa, cid); assert n = 2, 'launch enrols the two approved leads';
  select status into st from public.outreach_campaign where id = cid; assert st = 'active', 'campaign is active';
  ok := false; begin perform public.outreach_campaign_launch(wa, cid); exception when others then ok := true; end;
  assert ok, 'cannot launch twice';
  ok := false; begin perform public.outreach_campaign_save(wa, cid, 'x', steps); exception when others then ok := true; end;
  assert ok, 'a launched campaign cannot be edited';

  -- a lead approved later joins through sync; a lead is only ever in one campaign
  perform public.outreach_leads_set_status(wa, array['e5000000-0000-0000-0000-000000000003']::uuid[], 'approved');
  assert public.outreach_campaign_sync(wa, cid) = 1, 'sync adds the newly approved lead';
  assert public.outreach_campaign_sync(wa, cid) = 0, 'sync adds nobody twice';

  -- rejecting a lead stops its sequence
  perform public.outreach_leads_set_status(wa, array['e5000000-0000-0000-0000-000000000001']::uuid[], 'rejected');
  select state into st from public.outreach_enrollment where lead_id = 'e5000000-0000-0000-0000-000000000001'; assert st = 'stopped', 'a rejected lead stops';

  perform public.outreach_campaign_set_status(wa, cid, 'paused');
  select status into st from public.outreach_campaign where id = cid; assert st = 'paused', 'pause works';

  select count(*) into n from public.outreach_enrollment; assert n = 3, 'owner sees own enrolments';
  ok := false; begin update public.outreach_enrollment set state = 'completed'; exception when others then ok := true; end;
  assert ok, 'no direct writes';
  reset role;

  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}',true);
  select count(*) into n from public.outreach_campaign; assert n = 0, 'another workspace sees nothing';
  reset role;
end $$;
rollback;
select 'outreach campaigns tests passed' as result;
