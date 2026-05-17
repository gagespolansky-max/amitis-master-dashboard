-- ============================================================================
-- Data Layer Attio transcript memory
--
-- Scheduled Attio call transcript ingestion lands here first. These tables are
-- the normalized agent memory source; Attio remains the raw CRM source.
-- ============================================================================

create extension if not exists pgcrypto;

create or replace function public.data_layer_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'attio_transcript_status') then
    create type attio_transcript_status as enum (
      'received',
      'transcript_fetched',
      'classified',
      'summarized',
      'profiles_updated',
      'ready_for_review',
      'reviewed',
      'ignored',
      'needs_human_review',
      'error'
    );
  end if;
end $$;

create table if not exists public.call_transcripts (
  id                            uuid primary key default gen_random_uuid(),
  attio_workspace_id            text,
  attio_meeting_id              text not null,
  attio_call_recording_id       text not null,
  attio_call_recording_status   text,
  attio_created_at              timestamptz,
  call_date                     timestamptz not null,
  title                         text,
  raw_transcript                text,
  transcript_segments           jsonb not null default '[]'::jsonb,
  summary                       jsonb not null default '{}'::jsonb,
  classification                jsonb not null default '{}'::jsonb,
  labels                        text[] not null default '{}',
  status                        attio_transcript_status not null default 'received',
  source_url                    text,
  processing_error              text,
  processed_at                  timestamptz,
  reviewed_at                   timestamptz,
  reviewed_by                   text,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  unique (attio_meeting_id, attio_call_recording_id)
);

create index if not exists call_transcripts_status_idx
  on public.call_transcripts(status, call_date desc);
create index if not exists call_transcripts_call_date_idx
  on public.call_transcripts(call_date desc);
create index if not exists call_transcripts_labels_idx
  on public.call_transcripts using gin(labels);

drop trigger if exists call_transcripts_set_updated_at on public.call_transcripts;
create trigger call_transcripts_set_updated_at
  before update on public.call_transcripts
  for each row execute function public.data_layer_set_updated_at();

alter table public.call_transcripts enable row level security;

create table if not exists public.call_participants (
  id                    uuid primary key default gen_random_uuid(),
  call_transcript_id    uuid not null references public.call_transcripts(id) on delete cascade,
  display_name          text,
  email                 text,
  firm_name             text,
  attio_person_id       text,
  attio_company_id      text,
  company_identity_id   text,
  person_identity_id    text,
  participant_identity_id text,
  inferred_role         text,
  is_organizer          boolean not null default false,
  raw                   jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.call_participants add column if not exists company_identity_id text;
alter table public.call_participants add column if not exists person_identity_id text;
alter table public.call_participants add column if not exists participant_identity_id text;

create index if not exists call_participants_call_idx on public.call_participants(call_transcript_id);
create index if not exists call_participants_email_idx on public.call_participants(lower(email)) where email is not null;
create index if not exists call_participants_company_identity_idx
  on public.call_participants(company_identity_id) where company_identity_id is not null;
create index if not exists call_participants_person_identity_idx
  on public.call_participants(person_identity_id) where person_identity_id is not null;
create index if not exists call_participants_composite_identity_idx
  on public.call_participants(participant_identity_id) where participant_identity_id is not null;
create unique index if not exists call_participants_attio_person_unique
  on public.call_participants(call_transcript_id, attio_person_id) where attio_person_id is not null;
create unique index if not exists call_participants_email_unique
  on public.call_participants(call_transcript_id, lower(email)) where email is not null;

drop trigger if exists call_participants_set_updated_at on public.call_participants;
create trigger call_participants_set_updated_at
  before update on public.call_participants
  for each row execute function public.data_layer_set_updated_at();

alter table public.call_participants enable row level security;

create table if not exists public.counterparty_profiles (
  id                               uuid primary key default gen_random_uuid(),
  name                             text not null,
  domain                           text,
  attio_company_id                 text,
  profile_summary                  text,
  relationship_status              text,
  current_needs                    text[] not null default '{}',
  preferences                      text[] not null default '{}',
  risks                            text[] not null default '{}',
  last_call_at                     timestamptz,
  source_observation_count         integer not null default 0,
  synthesized_from_observation_ids uuid[] not null default '{}',
  synthesis_payload                jsonb not null default '{}'::jsonb,
  created_at                       timestamptz not null default now(),
  updated_at                       timestamptz not null default now()
);

create unique index if not exists counterparty_profiles_attio_company_unique
  on public.counterparty_profiles(attio_company_id) where attio_company_id is not null;
create unique index if not exists counterparty_profiles_domain_unique
  on public.counterparty_profiles(domain) where domain is not null;
create index if not exists counterparty_profiles_name_idx on public.counterparty_profiles(lower(name));
create index if not exists counterparty_profiles_domain_idx on public.counterparty_profiles(domain) where domain is not null;

drop trigger if exists counterparty_profiles_set_updated_at on public.counterparty_profiles;
create trigger counterparty_profiles_set_updated_at
  before update on public.counterparty_profiles
  for each row execute function public.data_layer_set_updated_at();

alter table public.counterparty_profiles enable row level security;

create table if not exists public.counterparty_observations (
  id                        uuid primary key default gen_random_uuid(),
  counterparty_profile_id   uuid not null references public.counterparty_profiles(id) on delete cascade,
  call_transcript_id        uuid not null references public.call_transcripts(id) on delete cascade,
  call_participant_id       uuid references public.call_participants(id) on delete set null,
  observation_date          timestamptz not null,
  topic                     text not null,
  observation_type          text not null,
  claim                     text not null,
  evidence                  text,
  speaker_name              text,
  confidence                numeric(3, 2) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  metadata                  jsonb not null default '{}'::jsonb,
  created_at                timestamptz not null default now(),
  unique (call_transcript_id, topic, claim, speaker_name)
);

create index if not exists counterparty_observations_profile_idx
  on public.counterparty_observations(counterparty_profile_id, observation_date desc);
create index if not exists counterparty_observations_call_idx on public.counterparty_observations(call_transcript_id);
create index if not exists counterparty_observations_topic_idx on public.counterparty_observations(lower(topic));

alter table public.counterparty_observations enable row level security;

create table if not exists public.llm_call_log (
  id                    uuid primary key default gen_random_uuid(),
  call_transcript_id    uuid references public.call_transcripts(id) on delete set null,
  counterparty_profile_id uuid references public.counterparty_profiles(id) on delete set null,
  task                  text not null,
  prompt_version        text not null,
  model                 text not null,
  input_payload         jsonb not null default '{}'::jsonb,
  output_payload        jsonb,
  raw_output            text,
  latency_ms            integer,
  input_tokens          integer,
  output_tokens         integer,
  error                 text,
  created_at            timestamptz not null default now()
);

create index if not exists llm_call_log_transcript_idx on public.llm_call_log(call_transcript_id, created_at desc);
create index if not exists llm_call_log_profile_idx on public.llm_call_log(counterparty_profile_id, created_at desc);
create index if not exists llm_call_log_task_idx on public.llm_call_log(task, created_at desc);

alter table public.llm_call_log enable row level security;
