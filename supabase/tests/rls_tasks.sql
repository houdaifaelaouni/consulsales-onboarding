-- Tests for task sync. Rolled back. Prints 'task sync tests passed'.
begin;
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000a6','a6@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000d6','lead6@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
insert into public.workspace (id, company, plan) values ('60000000-0000-0000-0000-00000000000a','Agency A6','pro');
insert into public.membership values
  ('60000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a6','client_owner'),
  ('60000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000d6','delivery_lead');
insert into public.task (workspace_id, type) values
  ('60000000-0000-0000-0000-00000000000a','connect_linkedin'),
  ('60000000-0000-0000-0000-00000000000a','connect_crm'),
  ('60000000-0000-0000-0000-00000000000a','approve_icp'),
  ('60000000-0000-0000-0000-00000000000a','complete_intake');
insert into public.deliverable (id, workspace_id, kind, title) values ('61000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-00000000000a','icp','ICP');
insert into public.deliverable_version (deliverable_id, n, workspace_id, content) values ('61000000-0000-0000-0000-000000000001',1,'60000000-0000-0000-0000-00000000000a','x');

do $$
declare s text;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a6","role":"authenticated"}',true);

  insert into public.access_item (workspace_id, item_id, status) values ('60000000-0000-0000-0000-00000000000a','linkedin','blocked');
  select status::text into s from public.task where type = 'connect_linkedin'; assert s = 'blocked', 'blocked access blocks the task';
  update public.access_item set status = 'connected' where item_id = 'linkedin';
  select status::text into s from public.task where type = 'connect_linkedin'; assert s = 'done', 'connected access completes the task';
  insert into public.access_item (workspace_id, item_id, status) values ('60000000-0000-0000-0000-00000000000a','calendar','connected');
  select count(*) filter (where status = 'done') :: text into s from public.task; assert s = '1', 'the booking link has no task, nothing else changes';
  select status::text into s from public.task where type = 'connect_crm'; assert s = 'todo', 'crm untouched';

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000d6","role":"authenticated"}',true);
  perform public.deliverable_submit('61000000-0000-0000-0000-000000000001');
  select status::text into s from public.task where type = 'approve_icp'; assert s = 'todo', 'sending for review does not complete the approval task';
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a6","role":"authenticated"}',true);
  perform public.deliverable_decide('61000000-0000-0000-0000-000000000001','approve',null,1);
  select status::text into s from public.task where type = 'approve_icp'; assert s = 'done', 'approval completes the task';
  select status::text into s from public.task where type = 'complete_intake'; assert s = 'todo', 'intake task untouched';
end $$;
rollback;
select 'task sync tests passed' as result;
