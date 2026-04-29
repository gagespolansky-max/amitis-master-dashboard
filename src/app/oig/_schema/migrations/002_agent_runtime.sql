-- ============================================================================
-- OIG Phase 4 Agent Runtime
-- Tables that back the agent loop itself: per-agent conversations, message
-- transcripts, and durable per-user agent memory (e.g. briefing preferences).
--
-- All three tables are auth-gated through API routes that use the service-role
-- Supabase client, mirroring the Phase 1 RLS posture (RLS on, no policies).
--
-- Apply via: Supabase SQL Editor, the Supabase MCP tool, or supabase CLI.
-- Re-running is safe: every CREATE/ALTER guards against duplicates.
-- ============================================================================

-- pgcrypto for gen_random_uuid(); already provisioned by 001 but safe to repeat.
create extension if not exists pgcrypto;

-- ============================================================================
-- agent_conversations
-- One row per chat session between a user and a specific agent. The
-- (user_id, agent_slug) pair partitions visibility — never join across rows
-- for different users; never mix agent slugs in the loop.
-- ============================================================================
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

-- ============================================================================
-- agent_messages
-- Append-only transcript. `content_json` stores the raw Anthropic
-- MessageParam shape (string OR array of text/tool_use/tool_result blocks)
-- so we can round-trip any tool-using assistant turn losslessly.
-- ============================================================================
create table if not exists public.agent_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.agent_conversations(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'tool', 'system')),
  content_json    jsonb not null,
  created_at      timestamptz not null default now()
);

create index if not exists agent_messages_conversation_idx
  on public.agent_messages(conversation_id, created_at);

alter table public.agent_messages enable row level security;

-- ============================================================================
-- agent_memory
-- Durable, file-shaped per-user agent memory. Today: only Chief of Staff's
-- `briefing-preferences.md`. Future: any small markdown blobs the agents
-- explicitly opt into (preferences, persistent context, runbooks).
-- One row per (user_id, agent_slug, filename); upsert on that triple.
-- ============================================================================
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

drop trigger if exists agent_memory_set_updated_at on public.agent_memory;
create trigger agent_memory_set_updated_at
  before update on public.agent_memory
  for each row execute function public.oig_set_updated_at();

alter table public.agent_memory enable row level security;

-- ============================================================================
-- RLS posture (unchanged from 001)
-- All three tables have RLS enabled with NO policies. API routes use the
-- service-role Supabase client (which bypasses RLS); auth gating happens in
-- middleware + per-route `requireAgentAccess` checks, not at the row level.
-- ============================================================================
