-- S1: payment provider linkage + webhook idempotency. Written for Whop; provider-agnostic columns.
alter table public.workspace
  add column payment_provider text,
  add column payment_id text,
  add column contact_email text;
create unique index workspace_payment_unique on public.workspace (payment_provider, payment_id)
  where payment_id is not null;

-- One row per processed webhook delivery. Service role only (RLS on, no policies).
create table public.payment_event (
  id text primary key,
  provider text not null,
  type text not null,
  processed_at timestamptz not null default now()
);
alter table public.payment_event enable row level security;
