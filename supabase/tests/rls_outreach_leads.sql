-- Tests for outreach leads. Rolled back. Prints 'outreach leads tests passed'.
begin;
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000c7','c7@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000c8','c8@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
insert into public.workspace (id, company, plan) values
  ('e3000000-0000-0000-0000-00000000000a','Leads A','pro'),
  ('e3000000-0000-0000-0000-00000000000b','Leads B','pro');
insert into public.membership values
  ('e3000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000c7','client_owner'),
  ('e3000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000c8','client_owner');

do $$
declare r jsonb; n int; ok boolean; wa constant uuid := 'e3000000-0000-0000-0000-00000000000a'; wb constant uuid := 'e3000000-0000-0000-0000-00000000000b'; ids uuid[];
begin
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000c7","role":"authenticated"}',true);

  r := public.outreach_leads_import(wa, '[{"full_name":"Ana Costa","title":"Founder","company":"Nova","linkedin_key":"ana-costa","linkedin_url":"https://www.linkedin.com/in/ana-costa/"},
                                         {"full_name":"Marc Dubois","linkedin_key":"marc-dubois","linkedin_url":"https://www.linkedin.com/in/marc-dubois/"},
                                         {"full_name":"Ana again","linkedin_key":"ana-costa","linkedin_url":"https://www.linkedin.com/in/ana-costa/"},
                                         {"full_name":"","linkedin_key":"nobody","linkedin_url":"x"}]'::jsonb);
  assert (r->>'added')::int = 2 and (r->>'duplicates')::int = 2, 'duplicates and empty names are skipped';
  r := public.outreach_leads_import(wa, '[{"full_name":"Ana Costa","linkedin_key":"ana-costa","linkedin_url":"https://www.linkedin.com/in/ana-costa/"}]'::jsonb);
  assert (r->>'added')::int = 0, 'importing the same person twice adds nothing';

  select count(*) into n from public.outreach_lead; assert n = 2, 'owner sees own leads';
  select array_agg(id) into ids from public.outreach_lead where linkedin_key = 'ana-costa';
  assert public.outreach_leads_set_status(wa, ids, 'approved') = 1, 'owner approves a lead';
  assert public.outreach_leads_approve_all(wa) = 1, 'approve all moves the rest';
  select count(*) into n from public.outreach_lead where status = 'approved'; assert n = 2, 'both approved';

  ok := false; begin perform public.outreach_leads_set_status(wa, ids, 'sent'); exception when others then ok := true; end;
  assert ok, 'a made-up status is refused';
  ok := false; begin perform public.outreach_leads_import(wb, '[{"full_name":"X","linkedin_key":"x","linkedin_url":"y"}]'::jsonb); exception when others then ok := true; end;
  assert ok, 'cannot import into another workspace';
  ok := false; begin perform public.outreach_leads_import(wa, '[]'::jsonb); exception when others then ok := true; end;
  assert ok, 'an empty list is refused';
  ok := false; begin update public.outreach_lead set status = 'new'; exception when others then ok := true; end;
  assert ok, 'no direct writes';
  ok := false; begin perform public.outreach_leads_set_status(wb, ids, 'rejected'); exception when others then ok := true; end;
  assert ok, 'cannot change leads of another workspace';
  reset role;
end $$;
rollback;
select 'outreach leads tests passed' as result;
