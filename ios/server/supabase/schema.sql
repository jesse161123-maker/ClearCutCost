create extension if not exists pgcrypto;

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  document_type text not null,
  document_text text not null default '',
  document_file_name text,
  document_image_url text,
  risk_level text not null,
  summary text not null,
  key_findings jsonb not null default '[]'::jsonb,
  ai_recommendations text not null default '',
  suggested_questions jsonb not null default '[]'::jsonb,
  market_comparison text,
  submitted_price text,
  is_subscribed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists analyses_session_created_idx
  on public.analyses (session_id, created_at desc);

create table if not exists public.revenuecat_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  type text not null,
  app_user_id text,
  product_id text,
  entitlement_ids jsonb not null default '[]'::jsonb,
  environment text,
  purchased_at_ms bigint,
  expiration_at_ms bigint,
  raw_payload jsonb not null,
  received_at timestamptz not null default now()
);

create index if not exists revenuecat_events_received_idx
  on public.revenuecat_events (received_at desc);

create index if not exists revenuecat_events_app_user_idx
  on public.revenuecat_events (app_user_id, received_at desc);

alter table public.analyses enable row level security;
alter table public.revenuecat_events enable row level security;

-- No public policies are intentionally created.
-- The backend should access these tables with SUPABASE_SERVICE_ROLE_KEY only.
