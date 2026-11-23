-- Connecting a client's LinkedIn account through Unipile's hosted login. We store only Unipile's account id and its status:
-- never a LinkedIn password. The client must accept a risk notice (recorded, append-only) before a connect link is made.

create table public.outreach_consent (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  user_id uuid not null references public.app_user (id),
  notice_version text not null,
  accepted_at timestamptz not null default now()
);
create index outreach_consent_ws_idx on public.outreach_consent (workspace_id);

-- One short-lived, single-use token per connect click. Unipile's notification carries it back as the account "name",
-- which is how we know which workspace the new account belongs to (Unipile does not sign this notification).
create table public.outreach_connect_attempt (
  token_hash text primary key,
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  created_by uuid not null references public.app_user (id),
  expires_at timestamptz not null,
  used_at timestamptz
);

create table public.outreach_account (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  unipile_account_id text not null unique,
  provider text not null default 'LINKEDIN',
  status text not null default 'connecting' check (status in ('connecting','ok','credentials','error','deleted')),
  connected_at timestamptz not null default now(),
  status_at timestamptz not null default now()
);
create index outreach_account_ws_idx on public.outreach_account (workspace_id);

alter table public.outreach_consent enable row level security;
alter table public.outreach_connect_attempt enable row level security;
alter table public.outreach_account enable row level security;

create policy outreach_consent_select on public.outreach_consent for select to authenticated
  using (public.is_member(workspace_id) or public.is_admin());
create policy outreach_consent_insert on public.outreach_consent for insert to authenticated
  with check (user_id = auth.uid() and public.has_role(workspace_id, 'client_owner'));
create policy outreach_account_select on public.outreach_account for select to authenticated
  using (public.is_member(workspace_id) or public.is_admin());

revoke all on public.outreach_consent, public.outreach_connect_attempt, public.outreach_account from anon, authenticated;
grant select, insert on public.outreach_consent to authenticated;
grant select on public.outreach_account to authenticated;
