-- ============================================================================
-- OIG Fund Docs Slack Agent event log
--
-- Runtime idempotency and status tracking for Slack Events API retries.
-- This table is intentionally small: it is not an OIG interaction source and
-- does not store retrieved document text.
-- ============================================================================

do $$ begin
  if not exists (select 1 from pg_type where typname = 'oig_slack_fund_doc_event_status') then
    create type oig_slack_fund_doc_event_status as enum (
      'received',
      'processing',
      'answered',
      'ignored',
      'failed'
    );
  end if;
end $$;

create table if not exists public.slack_fund_doc_events (
  id             uuid primary key default gen_random_uuid(),
  event_id       text not null unique,
  team_id        text not null,
  channel_id     text not null,
  user_id        text not null,
  message_ts     text not null,
  thread_ts      text not null,
  status         oig_slack_fund_doc_event_status not null default 'received',
  fund_slug      text,
  question       text,
  response_ts    text,
  retry_num      integer,
  retry_reason   text,
  error          text,
  processed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists slack_fund_doc_events_status_idx
  on public.slack_fund_doc_events(status, created_at desc);

create index if not exists slack_fund_doc_events_channel_idx
  on public.slack_fund_doc_events(channel_id, message_ts);

create index if not exists slack_fund_doc_events_fund_idx
  on public.slack_fund_doc_events(fund_slug)
  where fund_slug is not null;

drop trigger if exists slack_fund_doc_events_set_updated_at on public.slack_fund_doc_events;
create trigger slack_fund_doc_events_set_updated_at
  before update on public.slack_fund_doc_events
  for each row execute function public.oig_set_updated_at();

alter table public.slack_fund_doc_events enable row level security;
