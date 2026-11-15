-- Security fix S1 (audit): a user could edit their own app_user.email, and both the PIN login and the payment
-- webhook trusted that column. Now users may change only name and locale, email is unique and follows auth.users,
-- and the PIN lookup uses the account's real (auth) email.

-- Make the stored email match the real account email, in lower case, before it becomes unique.
update public.app_user a set email = lower(u.email) from auth.users u where u.id = a.id and a.email is distinct from lower(u.email);

revoke update on public.app_user from anon, authenticated;
grant update (name, locale) on public.app_user to authenticated;
create unique index app_user_email_unique on public.app_user (lower(email));

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.app_user (id, email) values (new.id, lower(new.email));
  return new;
end $$;

-- If someone changes their sign-in email through Auth, the profile follows.
create function public.sync_user_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.app_user set email = lower(new.email) where id = new.id;
  return new;
end $$;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email) execute function public.sync_user_email();

-- The PIN belongs to an account, so find the account by its real sign-in email.
create or replace function public.pin_verify(p_email text, p_pin text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare u uuid; r public.user_pin; ok boolean;
begin
  select id into u from auth.users where lower(email) = lower(trim(p_email));
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
revoke all on function public.pin_verify(text, text) from public, anon, authenticated;
grant execute on function public.pin_verify(text, text) to service_role;
