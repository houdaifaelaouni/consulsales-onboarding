-- RLS tests for access_item. One transaction, rolled back. Prints 'RLS access tests passed'.
begin;
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000a3','a3@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000b3','b3@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000d3','lead3@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
insert into public.workspace (id, company, plan) values
  ('30000000-0000-0000-0000-00000000000a','Agency A3','starter'),
  ('30000000-0000-0000-0000-00000000000b','Agency B3','pro');
insert into public.membership values
  ('30000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a3','client_owner'),
  ('30000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000b3','client_owner'),
  ('30000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000d3','delivery_lead');
insert into public.access_item (workspace_id, item_id, status) values
  ('30000000-0000-0000-0000-00000000000b','crm','connected');

do $$
declare n int; ok boolean; t1 timestamptz; t2 timestamptz;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}',true);

  insert into public.access_item (workspace_id, item_id, status) values ('30000000-0000-0000-0000-00000000000a','crm','connected')
    on conflict (workspace_id, item_id) do update set status = excluded.status;
  select count(*) into n from public.access_item; assert n = 1, format('A sees own item only, saw %s', n);

  -- blocked stamps a start time that survives repeated saves, and clears when unblocked
  insert into public.access_item (workspace_id, item_id, status) values ('30000000-0000-0000-0000-00000000000a','linkedin','blocked');
  select blocked_since into t1 from public.access_item where item_id = 'linkedin'; assert t1 is not null, 'blocked_since must be stamped';
  update public.access_item set status = 'blocked', detail = 'again' where item_id = 'linkedin';
  select blocked_since into t2 from public.access_item where item_id = 'linkedin'; assert t1 = t2, 'blocked_since must not move';
  update public.access_item set status = 'connected' where item_id = 'linkedin';
  select count(*) into n from public.access_item where item_id = 'linkedin' and blocked_since is null; assert n = 1, 'blocked_since clears';

  ok := false;
  begin insert into public.access_item (workspace_id, item_id, status) values ('30000000-0000-0000-0000-00000000000b','x','connected'); exception when others then ok := true; end;
  assert ok, 'A must not write into B';
  update public.access_item set status = 'blocked' where workspace_id = '30000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count; assert n = 0, 'A must not update B';
  delete from public.access_item where workspace_id = '30000000-0000-0000-0000-00000000000a';
  get diagnostics n = row_count; assert n = 0, 'nobody deletes access rows';
  ok := false;
  begin insert into public.access_item (workspace_id, item_id, status) values ('30000000-0000-0000-0000-00000000000a','bad','weird'); exception when others then ok := true; end;
  assert ok, 'status must be valid';

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}',true);
  select count(*) into n from public.access_item; assert n = 2, format('lead reads A items, saw %s', n);
  ok := false;
  begin insert into public.access_item (workspace_id, item_id, status) values ('30000000-0000-0000-0000-00000000000a','lead','connected'); exception when others then ok := true; end;
  assert ok, 'delivery lead must not write';
  update public.access_item set status = 'pending' where workspace_id = '30000000-0000-0000-0000-00000000000a';
  get diagnostics n = row_count; assert n = 0, 'delivery lead must not edit';

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}',true);
  select count(*) into n from public.access_item where workspace_id = '30000000-0000-0000-0000-00000000000a'; assert n = 0, 'B must not read A';

  reset role; set local role anon; perform set_config('request.jwt.claims','{}',true);
  begin select count(*) into n from public.access_item; assert n = 0, 'anon sees nothing'; exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'RLS access tests passed' as result;
