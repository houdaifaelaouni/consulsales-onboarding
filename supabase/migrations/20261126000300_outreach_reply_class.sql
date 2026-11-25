-- A reply is what stops a sequence, but "how good was it" is a judgement: positive, neutral or negative, and whether a
-- meeting came out of it. The analytics tiles read these columns; they stay empty (and show 0) until something classifies
-- the reply, so nothing is invented. Only the campaign owner may record the judgement.

alter table public.outreach_enrollment
  add column reply_class text check (reply_class in ('positive','neutral','negative')),
  add column meeting_booked_at timestamptz;

create function public.outreach_enrollment_classify(
  p_ws uuid, p_enrollment uuid, p_class text, p_meeting boolean default false
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(p_ws, 'client_owner') then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_class is null or p_class not in ('positive','neutral','negative') then
    raise exception 'bad class' using errcode = '22023';
  end if;
  update public.outreach_enrollment
    set reply_class = p_class,
        meeting_booked_at = case when p_meeting then coalesce(meeting_booked_at, now()) else meeting_booked_at end
    where id = p_enrollment and workspace_id = p_ws and state = 'replied';
  if not found then raise exception 'only a reply can be classified' using errcode = '23514'; end if;
end $$;

revoke all on function public.outreach_enrollment_classify(uuid, uuid, text, boolean) from public, anon;
grant execute on function public.outreach_enrollment_classify(uuid, uuid, text, boolean) to authenticated;
