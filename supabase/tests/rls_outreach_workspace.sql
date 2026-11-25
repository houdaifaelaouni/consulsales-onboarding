-- Tests for the campaign workspace. Rolled back. Prints 'outreach workspace tests passed'.
begin;
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000f1','f1@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-0000000000f2','f2@test.dev','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
insert into public.workspace (id, company, plan) values
  ('f6000000-0000-0000-0000-00000000000a','Workspace A','pro'),
  ('f6000000-0000-0000-0000-00000000000b','Workspace B','pro');
insert into public.membership values
  ('f6000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000f1','client_owner'),
  ('f6000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000f2','client_owner');
insert into public.outreach_settings (workspace_id, invites_per_day, messages_per_day, paused) values
  ('f6000000-0000-0000-0000-00000000000a', 10, 20, false);
insert into public.outreach_account (id, workspace_id, unipile_account_id, status) values
  ('f8000000-0000-0000-0000-000000000001','f6000000-0000-0000-0000-00000000000a','accA','ok'),
  ('f8000000-0000-0000-0000-000000000002','f6000000-0000-0000-0000-00000000000b','accB','ok');

do $$
declare
  cid uuid; dup uuid; n int; b boolean; a jsonb; row_out record; prof record;
  wa constant uuid := 'f6000000-0000-0000-0000-00000000000a';
  wb constant uuid := 'f6000000-0000-0000-0000-00000000000b';
begin
  -- the owner creates a draft with the dialog's options
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}',true);
  cid := public.outreach_campaign_create(wa, 'Q1 Outreach', 'Target enterprise customers', 'LINKEDIN',
    '{"engage_before":true,"engage_after":false,"contact_again_days":75,"skip_existing":true,"warmup_mode":true}'::jsonb);
  select * into row_out from public.outreach_campaign where id = cid;
  assert row_out.channel = 'LINKEDIN', 'the channel is stored';
  assert row_out.engage_before and row_out.skip_existing and row_out.warmup_mode, 'the options are stored';
  assert row_out.contact_again_days = 75, 'the repeat window is stored';
  assert row_out.description = 'Target enterprise customers', 'the description is stored';

  -- another workspace cannot create in, duplicate from, or read this campaign
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}',true);
  b := false; begin perform public.outreach_campaign_create(wa, 'Nope'); exception when others then b := true; end;
  assert b, 'a foreign workspace cannot create a campaign here';
  b := false; begin perform public.outreach_campaign_duplicate(wa, cid); exception when others then b := true; end;
  assert b, 'a foreign workspace cannot duplicate this campaign';
  select count(*) into n from public.outreach_campaign where id = cid;
  assert n = 0, 'a foreign workspace cannot see the campaign';
  reset role;

  -- a draft with steps can be duplicated, and the copy carries the steps and the settings
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}',true);
  perform public.outreach_campaign_save(wa, cid, 'Q1 Outreach', '[{"body":"Hi {first_name}"},{"delay_days":2,"body":"Following up"}]');
  dup := public.outreach_campaign_duplicate(wa, cid);
  reset role;
  select count(*) into n from public.outreach_step where campaign_id = dup;
  assert n = 2, 'the copy has both steps';
  select * into row_out from public.outreach_campaign where id = dup;
  assert row_out.status = 'draft' and row_out.name = 'Q1 Outreach (copy)', 'the copy is a draft with a clear name';
  assert row_out.skip_existing, 'the copy keeps the options';

  -- the CSV import fills the contact columns and the split name
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}',true);
  a := public.outreach_leads_import(wa, '[{"full_name":"Ana Costa","title":"Founder","company":"Nova","linkedin_key":"ana","linkedin_url":"https://www.linkedin.com/in/ana/","first_name":"Ana","last_name":"Costa","email":"ana@nova.com","phone":"+34 600 000 000","company_domain":"nova.com","location":"Barcelona, Spain"}]'::jsonb);
  assert (a ->> 'added')::int = 1, 'one lead imported';
  reset role;
  select * into row_out from public.outreach_lead where workspace_id = wa and linkedin_key = 'ana';
  assert row_out.email = 'ana@nova.com' and row_out.phone = '+34 600 000 000', 'email and phone are kept';
  assert row_out.company_domain = 'nova.com' and row_out.location = 'Barcelona, Spain', 'domain and location are kept';
  assert row_out.first_name = 'Ana' and row_out.last_name = 'Costa', 'the split name is kept';
  assert row_out.platform = 'linkedin', 'the platform defaults to LinkedIn';

  -- a lead inserted without a split name gets one from the full name
  insert into public.outreach_lead (workspace_id, full_name, linkedin_key, linkedin_url)
    values (wa, 'Marc Dubois', 'marc', 'https://www.linkedin.com/in/marc/');
  select * into row_out from public.outreach_lead where workspace_id = wa and linkedin_key = 'marc';
  assert row_out.first_name = 'Marc' and row_out.last_name = 'Dubois', 'the trigger fills the split name';

  -- analytics counts only this campaign, and only for its own workspace
  update public.outreach_lead set status = 'approved' where workspace_id = wa;
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}',true);
  perform public.outreach_campaign_launch(wa, cid);
  reset role;
  select count(*) into n from public.outreach_enrollment where campaign_id = cid;
  assert n = 2, 'both approved leads are enrolled';
  insert into public.outreach_send_log (workspace_id, enrollment_id, kind, step_position)
    select wa, id, 'invite', 0 from public.outreach_enrollment where campaign_id = cid limit 1;
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}',true);
  a := public.outreach_campaign_analytics(wa, cid);
  assert (a ->> 'leads')::int = 2, 'two leads in the campaign';
  assert (a ->> 'invites')::int = 1, 'one invitation counted from the send log';
  assert (a ->> 'pending')::int = 2, 'both leads wait for their next step';
  assert jsonb_array_length(a -> 'steps') = 1, 'the per-step counts are grouped';
  reset role;

  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}',true);
  b := false; begin a := public.outreach_campaign_analytics(wa, cid); exception when others then b := true; end;
  assert b, 'a foreign workspace cannot read the analytics';
  reset role;

  -- profiles: only healthy accounts of the same workspace can be assigned
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}',true);
  n := public.outreach_campaign_accounts_set(wa, cid, array['f8000000-0000-0000-0000-000000000001','f8000000-0000-0000-0000-000000000002']::uuid[]);
  assert n = 1, 'the foreign account is ignored';
  select count(*) into n from public.outreach_campaign_account where campaign_id = cid;
  assert n = 1, 'only the own account is assigned';
  reset role;

  -- a reply can be classified, and only by its owner
  update public.outreach_enrollment set state = 'replied', chat_id = 'chat-1'
    where campaign_id = cid and state = 'active' limit 1;
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}',true);
  perform public.outreach_enrollment_classify(wa, (select id from public.outreach_enrollment where campaign_id = cid and state = 'replied'), 'positive', true);
  reset role;
  select * into row_out from public.outreach_enrollment where campaign_id = cid and state = 'replied';
  assert row_out.reply_class = 'positive' and row_out.meeting_booked_at is not null, 'the reply is classified';
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}',true);
  a := public.outreach_campaign_analytics(wa, cid);
  assert (a ->> 'positive')::int = 1 and (a ->> 'meetings')::int = 1, 'the analytics see the classification';
  reset role;

  -- the agent profile is one row per workspace, written by the owner only
  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}',true);
  perform public.outreach_agent_profile_save(wa, 'consulsales.app', 'What we sell', 'B2B agencies', 'founder', 'Why us', 'Rules', '', 'Europe/Madrid');
  perform public.outreach_agent_profile_save(wa, 'consulsales.app', 'What we sell, v2', 'B2B agencies', 'ai', 'Why us', 'Rules', '', 'Europe/Madrid');
  select count(*) into n from public.outreach_agent_profile where workspace_id = wa;
  assert n = 1, 'a second save updates the same row';
  select * into prof from public.outreach_agent_profile where workspace_id = wa;
  assert prof.context = 'What we sell, v2' and prof.identity = 'ai', 'the last save wins';
  reset role;

  set local role authenticated;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}',true);
  select count(*) into n from public.outreach_agent_profile;
  assert n = 0, 'a foreign workspace sees no agent profile';
  b := false; begin perform public.outreach_agent_profile_save(wa, 'x', 'y', 'z', 'ai', '', '', '', 'Europe/Madrid'); exception when others then b := true; end;
  assert b, 'a foreign workspace cannot write the agent profile';
  reset role;
end $$;
rollback;
select 'outreach workspace tests passed' as result;
