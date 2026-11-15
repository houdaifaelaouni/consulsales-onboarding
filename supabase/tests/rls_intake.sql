-- RLS tests for intake_answer and event_log. One transaction, rolled back. Prints 'RLS intake tests passed'.
begin;
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000a2','a2@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000b2','b2@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000d2','lead2@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
insert into public.workspace (id, company, plan) values
  ('20000000-0000-0000-0000-00000000000a','Agency A2','starter'),
  ('20000000-0000-0000-0000-00000000000b','Agency B2','pro');
insert into public.membership values
  ('20000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a2','client_owner'),
  ('20000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000b2','client_owner'),
  ('20000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000d2','delivery_lead');
insert into public.intake_answer (workspace_id, question_key, value) values
  ('20000000-0000-0000-0000-00000000000b','offer','{"value":"B secret offer"}');
insert into public.event_log (workspace_id, actor, action) values
  ('20000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000b2','seed.b');

do $$
declare n int; ok boolean;
begin
  -- ===== Client owner A
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}',true);

  insert into public.intake_answer (workspace_id, question_key, value) values ('20000000-0000-0000-0000-00000000000a','offer','{"value":"We run paid search"}');
  -- upsert (what the app does on every autosave)
  insert into public.intake_answer (workspace_id, question_key, value) values ('20000000-0000-0000-0000-00000000000a','offer','{"value":"We run paid search for SaaS"}')
    on conflict (workspace_id, question_key) do update set value = excluded.value;
  select count(*) into n from public.intake_answer;
  assert n = 1, format('A should see exactly 1 answer (own), saw %s', n);
  select count(*) into n from public.intake_answer where value->>'value' = 'We run paid search for SaaS';
  assert n = 1, 'upsert should have replaced the value';

  ok := false;
  begin insert into public.intake_answer (workspace_id, question_key, value) values ('20000000-0000-0000-0000-00000000000b','x','{"value":"evil"}'); exception when others then ok := true; end;
  assert ok, 'A must not write into workspace B';

  update public.intake_answer set value = '{"value":"hijack"}' where workspace_id = '20000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count; assert n = 0, 'A must not update B answers';

  delete from public.intake_answer where workspace_id = '20000000-0000-0000-0000-00000000000a';
  get diagnostics n = row_count; assert n = 0, 'nobody can delete answers';

  ok := false;
  begin insert into public.intake_answer (workspace_id, question_key, value) values ('20000000-0000-0000-0000-00000000000a','bad','"not an object"'); exception when others then ok := true; end;
  assert ok, 'value must be a JSON object';

  -- server stamps who wrote it, even if the client lies
  insert into public.intake_answer (workspace_id, question_key, value, updated_by) values ('20000000-0000-0000-0000-00000000000a','team','{"value":"2 to 5"}','00000000-0000-0000-0000-0000000000b2');
  select count(*) into n from public.intake_answer where question_key = 'team' and updated_by = '00000000-0000-0000-0000-0000000000a2';
  assert n = 1, 'updated_by must be the real caller';

  -- ===== Event log as A
  insert into public.event_log (workspace_id, actor, action) values ('20000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a2','intake.saved');
  ok := false;
  begin insert into public.event_log (workspace_id, actor, action) values ('20000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000b2','forged'); exception when others then ok := true; end;
  assert ok, 'cannot log as someone else';
  ok := false;
  begin insert into public.event_log (workspace_id, actor, action) values ('20000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000a2','cross'); exception when others then ok := true; end;
  assert ok, 'cannot log into another workspace';
  select count(*) into n from public.event_log; assert n = 1, format('A sees only own events, saw %s', n);
  ok := false;
  begin update public.event_log set action = 'edited'; exception when others then ok := true; end;
  assert ok, 'event_log cannot be updated';
  ok := false;
  begin delete from public.event_log; exception when others then ok := true; end;
  assert ok, 'event_log cannot be deleted';

  -- ===== Delivery lead on A: reads, does not write
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}',true);
  select count(*) into n from public.intake_answer; assert n = 2, format('lead should read A answers, saw %s', n);
  ok := false;
  begin insert into public.intake_answer (workspace_id, question_key, value) values ('20000000-0000-0000-0000-00000000000a','lead','{"value":"nope"}'); exception when others then ok := true; end;
  assert ok, 'delivery lead must not answer for the client';
  update public.intake_answer set value = '{"value":"tampered"}' where workspace_id = '20000000-0000-0000-0000-00000000000a';
  get diagnostics n = row_count; assert n = 0, 'delivery lead must not edit answers';

  -- ===== Client owner B sees nothing of A
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}',true);
  select count(*) into n from public.intake_answer where workspace_id = '20000000-0000-0000-0000-00000000000a'; assert n = 0, 'B must not read A answers';
  select count(*) into n from public.event_log where workspace_id = '20000000-0000-0000-0000-00000000000a'; assert n = 0, 'B must not read A events';

  -- ===== Anonymous
  reset role; set local role anon; perform set_config('request.jwt.claims','{}',true);
  begin select count(*) into n from public.intake_answer; assert n = 0, 'anon must see no answers'; exception when insufficient_privilege then null; end;
  begin select count(*) into n from public.event_log; assert n = 0, 'anon must see no events'; exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'RLS intake tests passed' as result;
