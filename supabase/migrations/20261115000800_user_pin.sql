-- Backend slice 9: a 6-digit PIN as a full login (with the email). Server-side only: the browser never touches this table.
-- 6 digits is only a million combinations, so the lockout is the real protection: 5 wrong tries lock the PIN for 15 minutes.
create table public.user_pin (
  user_id uuid primary key references public.app_user (id) on delete cascade,
  pin_hash text not null,
  failed_tries int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.user_pin enable row level security;
-- No policies and no grants: only the service role (the server) can use it.
revoke all on public.user_pin from anon, authenticated;

create function public.pin_set(p_user uuid, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_pin !~ '^[0-9]{6}$' then raise exception 'PIN must be 6 digits' using errcode = '22023'; end if;
  insert into public.user_pin (user_id, pin_hash) values (p_user, crypt(p_pin, gen_salt('bf', 10)))
    on conflict (user_id) do update set pin_hash = excluded.pin_hash, failed_tries = 0, locked_until = null, updated_at = now();
end $$;

create function public.pin_clear(p_user uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.user_pin where user_id = p_user;
$$;

create function public.pin_exists(p_user uuid) returns boolean
language sql security definer set search_path = public as $$
  select exists (select 1 from public.user_pin where user_id = p_user);
$$;

-- Returns the user id when the email and PIN match, otherwise null. Callers must not say why it failed.
create function public.pin_verify(p_email text, p_pin text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare u uuid; r public.user_pin; ok boolean;
begin
  select id into u from public.app_user where lower(email) = lower(trim(p_email));
  if u is null then
    perform crypt(p_pin, gen_salt('bf', 10)); -- same work as a real check, so timing does not reveal unknown emails
    return null;
  end if;
  select * into r from public.user_pin where user_id = u for update;
  if r.user_id is null then perform crypt(p_pin, gen_salt('bf', 10)); return null; end if;
  if r.locked_until is not null and r.locked_until > now() then return null; end if;
  ok := p_pin ~ '^[0-9]{6}$' and r.pin_hash = crypt(p_pin, r.pin_hash);
  if ok then
    update public.user_pin set failed_tries = 0, locked_until = null where user_id = u;
    return u;
  end if;
  if r.failed_tries + 1 >= 5 then
    update public.user_pin set failed_tries = 0, locked_until = now() + interval '15 minutes' where user_id = u;
  else
    update public.user_pin set failed_tries = r.failed_tries + 1 where user_id = u;
  end if;
  return null;
end $$;

revoke all on function public.pin_set(uuid, text), public.pin_clear(uuid), public.pin_exists(uuid), public.pin_verify(text, text) from public, anon, authenticated;
grant execute on function public.pin_set(uuid, text), public.pin_clear(uuid), public.pin_exists(uuid), public.pin_verify(text, text) to service_role;
