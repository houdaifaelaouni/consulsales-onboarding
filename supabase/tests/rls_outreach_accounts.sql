-- Tests for outreach accounts and consent. Rolled back. Prints 'outreach account tests passed'.
begin;
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000c3','c3@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000c4','c4@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
insert into public.workspace (id, company, plan) values
  ('e1000000-0000-0000-0000-00000000000a','Outreach A','pro'),
  ('e1000000-0000-0000-0000-00000000000b','Outreach B','pro');
insert into public.membership values
  ('e1000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000c3','client_owner'),
  ('e1000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000c4','client_owner');
insert into public.outreach_account (workspace_id, unipile_account_id, status) values
  ('e1000000-0000-0000-0000-00000000000a','acc_a','ok'),
  ('e1000000-0000-0000-0000-00000000000b','acc_b','ok');
insert into public.outreach_connect_attempt (token_hash, workspace_id, created_by, expires_at) values
  ('hash1','e1000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000c3', now() + interval '1 hour');

do $$
declare n int; ok boolean;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}',true);
  select count(*) into n from public.outreach_account; assert n = 1, 'client sees only own accounts';
  ok := false; begin perform 1 from public.outreach_connect_attempt; exception when others then ok := true; end;
  assert ok, 'client cannot read connect attempts';
  ok := false; begin update public.outreach_account set status = 'error'; exception when others then ok := true; end;
  assert ok, 'client cannot change an account status';
  ok := false; begin insert into public.outreach_account (workspace_id, unipile_account_id) values ('e1000000-0000-0000-0000-00000000000a','acc_x'); exception when others then ok := true; end;
  assert ok, 'client cannot create an account row';

  insert into public.outreach_consent (workspace_id, user_id, notice_version) values ('e1000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000c3','v1');
  select count(*) into n from public.outreach_consent; assert n = 1, 'owner records consent for own workspace';
  ok := false; begin insert into public.outreach_consent (workspace_id, user_id, notice_version) values ('e1000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000c3','v1'); exception when others then ok := true; end;
  assert ok, 'cannot record consent for another workspace';
  ok := false; begin insert into public.outreach_consent (workspace_id, user_id, notice_version) values ('e1000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000c4','v1'); exception when others then ok := true; end;
  assert ok, 'cannot record consent as someone else';
  ok := false; begin update public.outreach_consent set notice_version = 'v2'; exception when others then ok := true; end;
  assert ok, 'consent cannot be edited';
  ok := false; begin delete from public.outreach_consent; exception when others then ok := true; end;
  assert ok, 'consent cannot be deleted';
  reset role;
end $$;
rollback;
select 'outreach account tests passed' as result;
