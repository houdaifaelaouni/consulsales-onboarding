-- RLS tests. Run in one transaction and rolled back (execute via Supabase SQL or `supabase db test`).
begin;
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1','a@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000b1','b@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000c1','admin@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
update public.app_user set is_admin = true where id = '00000000-0000-0000-0000-0000000000c1';
insert into public.workspace (id, company, plan) values
  ('10000000-0000-0000-0000-00000000000a','Agency A','starter'),
  ('10000000-0000-0000-0000-00000000000b','Agency B','pro');
insert into public.membership values
  ('10000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a1','client_owner'),
  ('10000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000b1','client_owner');
insert into public.task (workspace_id, type) values
  ('10000000-0000-0000-0000-00000000000a','intake'),
  ('10000000-0000-0000-0000-00000000000b','intake');

do $$
declare n int;
begin
  -- User A
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

  select count(*) into n from public.workspace;
  assert n = 1, format('A should see 1 workspace, saw %s', n);
  select count(*) into n from public.workspace where id = '10000000-0000-0000-0000-00000000000b';
  assert n = 0, 'A must not read workspace B';
  select count(*) into n from public.task;
  assert n = 1, format('A should see 1 task, saw %s', n);
  select count(*) into n from public.task where workspace_id = '10000000-0000-0000-0000-00000000000b';
  assert n = 0, 'A must not read tasks of B';
  select count(*) into n from public.membership where workspace_id = '10000000-0000-0000-0000-00000000000b';
  assert n = 0, 'A must not read memberships of B';
  select count(*) into n from public.app_user;
  assert n = 1, 'A sees only own profile';

  update public.task set status = 'done' where workspace_id = '10000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  assert n = 0, 'A must not update B tasks';

  begin
    insert into public.workspace (company, plan) values ('Evil','starter');
    assert false, 'A must not insert workspaces';
  exception when insufficient_privilege or others then null; end;

  update public.app_user set is_admin = true where id = '00000000-0000-0000-0000-0000000000a1';
  get diagnostics n = row_count;
  assert n = 0, 'A must not self-promote to admin';

  -- Admin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
  select count(*) into n from public.workspace;
  assert n = 2, format('admin should see 2 workspaces, saw %s', n);

  -- Anonymous
  reset role; set local role anon;
  perform set_config('request.jwt.claims', '{}', true);
  begin
    perform count(*) from public.workspace;
    assert false, 'anon must not read workspace';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
