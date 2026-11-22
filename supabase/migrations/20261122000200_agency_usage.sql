-- Rooms used is private to the agency: members read it through agency_usage; the raw counter is no longer callable from the browser.
revoke execute on function public.agency_rooms_used(uuid) from authenticated;

create function public.agency_usage(p_agency uuid) returns int
language sql stable security definer set search_path = public as $$
  select case when public.is_agency_member(p_agency) or public.is_admin() then public.agency_rooms_used(p_agency) end
$$;
revoke all on function public.agency_usage(uuid) from public, anon;
grant execute on function public.agency_usage(uuid) to authenticated;
