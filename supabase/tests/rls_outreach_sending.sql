-- Tests for sending. Rolled back. Prints 'outreach sending tests passed'.
begin;
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000e1','e1@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000e2','e2@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
insert into public.workspace (id, company, plan) values
  ('e6000000-0000-0000-0000-00000000000a','Sending A','pro'),
  ('e6000000-0000-0000-0000-00000000000b','Sending B','pro');
insert into public.membership values
  ('e6000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000e1','client_owner'),
  ('e6000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000e2','client_owner');
insert into public.outreach_settings (workspace_id, invites_per_day, messages_per_day, paused) values
  ('e6000000-0000-0000-0000-00000000000a', 2, 1, false);
insert into public.outreach_account (workspace_id, unipile_account_id, status) values
  ('e6000000-0000-0000-0000-00000000000a', 'accA', 'ok');
insert into public.outreach_lead (id, workspace_id, full_name, linkedin_key, linkedin_url, status) values
  ('e7000000-0000-0000-0000-000000000001','e6000000-0000-0000-0000-00000000000a','Ana','ana','https://www.linkedin.com/in/ana/','approved'),
  ('e7000000-0000-0000-0000-000000000002','e6000000-0000-0000-0000-00000000000a','Marc','marc','https://www.linkedin.com/in/marc/','approved'),
  ('e7000000-0000-0000-0000-000000000003','e6000000-0000-0000-0000-00000000000a','Sofia','sofia','https://www.linkedin.com/in/sofia/','approved');

do $$
declare cid uuid; n int; b boolean; e uuid; st text; cfg jsonb;
  wa constant uuid := 'e6000000-0000-0000-0000-00000000000a';
begin
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}',true);
  cid := public.outreach_campaign_save(wa, null, 'Sender', '[{"body":"Hi {first_name}"},{"delay_days":1,"body":"Thanks"},{"delay_days":2,"body":"Last one"}]');
  n := public.outreach_campaign_launch(wa, cid); assert n = 3, 'three leads enrolled';
  reset role;

  -- the sender only sees a workspace that is switched on, healthy and not stopped
  select count(*) into n from public.outreach_run_workspaces() where workspace_id = wa; assert n = 1, 'the ready workspace is listed';
  update public.outreach_settings set paused = true where workspace_id = wa;
  select count(*) into n from public.outreach_run_workspaces() where workspace_id = wa; assert n = 0, 'a paused workspace is not listed';
  update public.outreach_settings set paused = false where workspace_id = wa;
  update public.outreach_account set status = 'error' where unipile_account_id = 'accA';
  select count(*) into n from public.outreach_run_workspaces() where workspace_id = wa; assert n = 0, 'an unhealthy account is not listed';
  update public.outreach_account set status = 'ok' where unipile_account_id = 'accA';

  -- what is due: the invitation of every enrolled lead
  select count(*) into n from public.outreach_due_sends(wa, 10); assert n = 3, 'three invitations are due';
  select id into e from public.outreach_due_sends(wa, 10) order by due_at, enrollment_id limit 1;

  -- two invitations a day, then the cap stops the third inside the database
  perform public.outreach_record_send(wa, e, 'invite', 0, null);
  select position, awaiting_accept into n, b from public.outreach_enrollment where id = e;
  assert n = 1 and b, 'the invitation moved the sequence and it now waits for acceptance';
  select count(*) into n from public.outreach_due_sends(wa, 10) where enrollment_id = e; assert n = 0, 'nothing more is due until acceptance';
  b := false; begin perform public.outreach_record_send(wa, e, 'invite', 0, null); exception when others then b := true; end;
  assert b, 'a step that already moved cannot be sent twice';

  select id into e from public.outreach_due_sends(wa, 10) order by due_at, enrollment_id limit 1;
  perform public.outreach_record_send(wa, e, 'invite', 0, null);
  select id into e from public.outreach_due_sends(wa, 10) order by due_at, enrollment_id limit 1;
  b := false; begin perform public.outreach_record_send(wa, e, 'invite', 0, null); exception when others then b := true; end;
  assert b, 'the daily invitation cap is enforced inside the database';

  -- accepting an invitation makes the first message due; a Provider id is learned and kept
  perform public.outreach_lead_set_provider(wa, 'e7000000-0000-0000-0000-000000000001', 'ACo1');
  select id into e from public.outreach_enrollment where lead_id = 'e7000000-0000-0000-0000-000000000001';
  assert public.outreach_enrollment_accepted(wa, 'ACo1', 'ana') = 1, 'acceptance is matched by Provider id';
  assert public.outreach_enrollment_accepted(wa, 'ACo1', 'ana') = 0, 'acceptance is not applied twice';
  select (accepted_at is not null and next_due_at is not null) into b from public.outreach_enrollment where id = e;
  assert b, 'the first message is scheduled';

  perform public.outreach_record_send(wa, e, 'message', 1, 'chatA');
  select position, chat_id into n, st from public.outreach_enrollment where id = e;
  assert n = 2 and st = 'chatA', 'the message advanced the sequence and kept the chat';
  select next_due_at is not null into b from public.outreach_enrollment where id = e; assert b, 'the next message is scheduled';

  -- one message a day: another lead who accepted still waits, even though invitations and messages are counted apart
  perform public.outreach_lead_set_provider(wa, 'e7000000-0000-0000-0000-000000000002', 'ACo2');
  perform public.outreach_enrollment_accepted(wa, 'ACo2', 'marc');
  select id into e from public.outreach_enrollment where lead_id = 'e7000000-0000-0000-0000-000000000002';
  update public.outreach_enrollment set next_due_at = now() where id = e;
  b := false; begin perform public.outreach_record_send(wa, e, 'message', 1, null); exception when others then b := true; end;
  assert b, 'the daily message cap is separate and enforced';

  -- a reply stops the sequence and keeps the chat
  assert public.outreach_enrollment_replied(wa, null, null, 'chatA') = 1, 'a reply is matched by chat';
  select state into st from public.outreach_enrollment where chat_id = 'chatA'; assert st = 'replied', 'a reply stops the sequence';
  assert public.outreach_enrollment_replied(wa, null, null, 'chatA') = 0, 'a second reply changes nothing';

  -- a failed step is retried once, then given up after three attempts
  select id into e from public.outreach_enrollment where lead_id = 'e7000000-0000-0000-0000-000000000003';
  perform public.outreach_record_failure(wa, e, 'Unipile invite failed (500)');
  select attempts, state into n, st from public.outreach_enrollment where id = e;
  assert n = 1 and st = 'active', 'a first failure is retried later';
  perform public.outreach_record_failure(wa, e, 'Unipile invite failed (500)');
  perform public.outreach_record_failure(wa, e, 'Unipile invite failed (500)');
  select attempts, state into n, st from public.outreach_enrollment where id = e;
  select next_due_at is null into b from public.outreach_enrollment where id = e;
  assert n = 3 and st = 'failed' and b, 'three failures stop that lead only';

  -- counts are per workspace and per day
  cfg := public.outreach_send_counts(wa);
  assert (cfg ->> 'invites')::int = 2 and (cfg ->> 'messages')::int = 1, 'today counts what went out';

  -- members may read their counts and log, not write; outsiders may do neither
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}',true);
  cfg := public.outreach_send_counts(wa); assert (cfg ->> 'invites')::int = 2, 'the owner can read the counts';
  b := false; begin perform public.outreach_record_send(wa, e, 'invite', 0, null); exception when others then b := true; end;
  assert b, 'the browser cannot record a send';
  select count(*) into n from public.outreach_send_log where workspace_id = wa; assert n = 3, 'the owner can read the log';
  reset role;

  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}',true);
  b := false; begin cfg := public.outreach_send_counts(wa); exception when others then b := true; end;
  assert b, 'another workspace cannot read the counts';
  select count(*) into n from public.outreach_send_log; assert n = 0, 'another workspace sees no log';
  reset role;
end $$;
rollback;
select 'outreach sending tests passed' as result;
