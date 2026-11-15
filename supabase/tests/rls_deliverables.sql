-- RLS and rule tests for deliverables. One transaction, rolled back. Prints 'RLS deliverable tests passed'.
begin;
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000a4','a4@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000b4','b4@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000d4','lead4@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000c4','admin4@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
update public.app_user set is_admin = true where id = '00000000-0000-0000-0000-0000000000c4';
insert into public.workspace (id, company, plan, payment_provider, payment_id) values
  ('40000000-0000-0000-0000-00000000000a','Agency A4','starter','whop','pay_test_a4'),
  ('40000000-0000-0000-0000-00000000000b','Agency B4','pro','whop','pay_test_b4');
insert into public.membership values
  ('40000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a4','client_owner'),
  ('40000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000b4','client_owner'),
  ('40000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000d4','delivery_lead');
insert into public.deliverable (id, workspace_id, kind, title, status) values
  ('41000000-0000-0000-0000-00000000000b','40000000-0000-0000-0000-00000000000b','icp','B secret','draft');
insert into public.deliverable_version (deliverable_id, n, workspace_id, content) values
  ('41000000-0000-0000-0000-00000000000b',1,'40000000-0000-0000-0000-00000000000b','B text');
update public.deliverable set status = 'in_review' where id = '41000000-0000-0000-0000-00000000000b';

do $$
declare n int; ok boolean; s text; did uuid := '41000000-0000-0000-0000-00000000000a';
begin
  -- ===== Delivery lead on A creates and submits
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000d4","role":"authenticated"}',true);
  insert into public.deliverable (id, workspace_id, kind, title) values (did,'40000000-0000-0000-0000-00000000000a','icp','Ideal client profile');
  ok := false;
  begin perform public.deliverable_submit(did); exception when others then ok := true; end;
  assert ok, 'cannot submit without a version';
  insert into public.deliverable_version (deliverable_id, n, workspace_id, content) values (did,1,'40000000-0000-0000-0000-00000000000a','v1 text');
  select count(*) into n from public.deliverable_version where created_by = '00000000-0000-0000-0000-0000000000d4'; assert n = 1, 'created_by stamped server-side';
  ok := false;
  begin insert into public.deliverable (workspace_id, kind, title, status) values ('40000000-0000-0000-0000-00000000000a','icp','sneaky','approved'); exception when others then ok := true; end;
  assert ok, 'cannot create an already-approved deliverable';
  ok := false;
  begin insert into public.deliverable (workspace_id, kind, title) values ('40000000-0000-0000-0000-00000000000b','icp','into B'); exception when others then ok := true; end;
  assert ok, 'lead of A cannot create in B';
  perform public.deliverable_submit(did);
  select status into s from public.deliverable where id = did; assert s = 'in_review', 'submitted';
  ok := false;
  begin perform public.deliverable_decide(did,'approve',null,1); exception when others then ok := true; end;
  assert ok, 'delivery lead must not approve';
  ok := false;
  begin update public.deliverable set status = 'approved' where id = did; exception when others then ok := true; end;
  assert ok, 'no direct status writes';

  -- ===== Client owner A
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}',true);
  select count(*) into n from public.deliverable; assert n = 1, format('A sees own deliverable only, saw %s', n);
  ok := false;
  begin perform public.deliverable_decide(did,'request_changes',' '); exception when others then ok := true; end;
  assert ok, 'changes need a note';
  perform public.deliverable_decide(did,'request_changes','Please add fintech');
  select status into s from public.deliverable where id = did; assert s = 'changes_requested', 'changes requested';
  ok := false;
  begin perform public.deliverable_decide(did,'approve',null,1); exception when others then ok := true; end;
  assert ok, 'cannot approve unless in review';
  ok := false;
  begin insert into public.deliverable_version (deliverable_id, n, workspace_id, content) values (did,2,'40000000-0000-0000-0000-00000000000a','client writes'); exception when others then ok := true; end;
  assert ok, 'client cannot write versions';
  ok := false;
  begin perform public.deliverable_decide('41000000-0000-0000-0000-00000000000b','approve',null,1); exception when others then ok := true; end;
  assert ok, 'A must not decide on B';

  -- lead revises and resubmits, client approves
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000d4","role":"authenticated"}',true);
  insert into public.deliverable_version (deliverable_id, n, workspace_id, content) values (did,2,'40000000-0000-0000-0000-00000000000a','v2 text');
  perform public.deliverable_submit(did);
  -- no new version while the client is reviewing
  ok := false;
  begin insert into public.deliverable_version (deliverable_id, n, workspace_id, content) values (did,3,'40000000-0000-0000-0000-00000000000a','sneaky v3'); exception when others then ok := true; end;
  assert ok, 'no new version while in review';
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}',true);
  -- approving must name the newest version
  ok := false; begin perform public.deliverable_decide(did,'approve',null,1); exception when others then ok := true; end;
  assert ok, 'approving an older version is refused';
  ok := false; begin perform public.deliverable_decide(did,'approve'); exception when others then ok := true; end;
  assert ok, 'approving without naming a version is refused';
  perform public.deliverable_decide(did,'approve',null,2);
  select count(*) into n from public.deliverable where id = did and status = 'approved' and approved_version = 2 and approved_by = '00000000-0000-0000-0000-0000000000a4';
  assert n = 1, 'approved with version and approver recorded';
  select count(*) into n from public.event_log where action = 'deliverable.approved' and actor = '00000000-0000-0000-0000-0000000000a4'; assert n = 1, 'approval logged';

  -- ===== Approved is locked, versions immutable
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000d4","role":"authenticated"}',true);
  ok := false;
  begin insert into public.deliverable_version (deliverable_id, n, workspace_id, content) values (did,3,'40000000-0000-0000-0000-00000000000a','after approval'); exception when others then ok := true; end;
  assert ok, 'approved deliverable takes no new version';
  ok := false;
  begin update public.deliverable_version set content = 'tamper' where deliverable_id = did; exception when others then ok := true; end;
  assert ok, 'versions cannot be edited';
  ok := false;
  begin delete from public.deliverable_version where deliverable_id = did; exception when others then ok := true; end;
  assert ok, 'versions cannot be deleted';
  ok := false;
  begin perform public.deliverable_submit(did); exception when others then ok := true; end;
  assert ok, 'approved cannot go back to review';

  -- ===== Client B sees nothing of A
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b4","role":"authenticated"}',true);
  select count(*) into n from public.deliverable where workspace_id = '40000000-0000-0000-0000-00000000000a'; assert n = 0, 'B must not read A deliverables';
  select count(*) into n from public.deliverable_version where workspace_id = '40000000-0000-0000-0000-00000000000a'; assert n = 0, 'B must not read A versions';

  -- ===== Admin override is logged as such
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000c4","role":"authenticated"}',true);
  perform public.deliverable_decide('41000000-0000-0000-0000-00000000000b','approve',null,1);
  select count(*) into n from public.event_log where action = 'deliverable.approved_override' and actor = '00000000-0000-0000-0000-0000000000c4'; assert n = 1, 'override logged';

  -- ===== The audit log cannot be forged by a member
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}',true);
  ok := false;
  begin insert into public.event_log (workspace_id, actor, action) values ('40000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a4','deliverable.approved'); exception when others then ok := true; end;
  assert ok, 'a member cannot write a fake approval event';
  ok := false;
  begin insert into public.event_log (workspace_id, actor, action, detail) values ('40000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a4','intake.saved','{"answered":2,"text":"personal data"}'); exception when others then ok := true; end;
  assert ok, 'intake.saved may carry only a count';
  insert into public.event_log (workspace_id, actor, action, detail) values ('40000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a4','intake.saved','{"answered":2}');

  -- ===== Anonymous
  reset role; set local role anon; perform set_config('request.jwt.claims','{}',true);
  begin select count(*) into n from public.deliverable; assert n = 0, 'anon sees nothing'; exception when insufficient_privilege then null; end;
  ok := false;
  begin perform public.deliverable_decide(did,'approve',null,1); exception when others then ok := true; end;
  assert ok, 'anon cannot decide';
end $$;
rollback;
select 'RLS deliverable tests passed' as result;
