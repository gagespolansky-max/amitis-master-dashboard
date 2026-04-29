-- ============================================================================
-- OIG Phase 4 Runtime Tables
-- Chief of Staff conversation history and lightweight agent memory.
--
-- Re-running is safe. RLS stays enabled with no policies, matching the OIG
-- service-role-only posture documented in 001_foundation.sql.
-- ============================================================================

create extension if not exists pgcrypto;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'agent_message_role') then
    create type agent_message_role as enum ('user', 'assistant', 'tool');
  end if;
end $$;

create table if not exists public.agent_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  agent_slug  text not null,
  title       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists agent_conversations_user_agent_updated_idx
  on public.agent_conversations(user_id, agent_slug, updated_at desc);
create index if not exists agent_conversations_agent_idx
  on public.agent_conversations(agent_slug);

drop trigger if exists agent_conversations_set_updated_at on public.agent_conversations;
create trigger agent_conversations_set_updated_at
  before update on public.agent_conversations
  for each row execute function public.oig_set_updated_at();

alter table public.agent_conversations enable row level security;

create table if not exists public.agent_messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.agent_conversations(id) on delete cascade,
  role              agent_message_role not null,
  content_json      jsonb not null,
  created_at        timestamptz not null default now()
);

create index if not exists agent_messages_conversation_created_idx
  on public.agent_messages(conversation_id, created_at asc);
create index if not exists agent_messages_role_idx on public.agent_messages(role);

alter table public.agent_messages enable row level security;

create table if not exists public.agent_memory (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  agent_slug  text not null,
  filename    text not null,
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, agent_slug, filename)
);

create index if not exists agent_memory_user_agent_idx
  on public.agent_memory(user_id, agent_slug);
create index if not exists agent_memory_agent_filename_idx
  on public.agent_memory(agent_slug, filename);

drop trigger if exists agent_memory_set_updated_at on public.agent_memory;
create trigger agent_memory_set_updated_at
  before update on public.agent_memory
  for each row execute function public.oig_set_updated_at();

alter table public.agent_memory enable row level security;
