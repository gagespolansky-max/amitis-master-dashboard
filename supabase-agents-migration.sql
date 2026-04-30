-- Run this in Supabase dashboard → SQL Editor → New Query.
-- Adds tables for the in-app agent platform (Email Drafter is the first; Chief of Staff and others slot in later).

-- agent_permissions: which users can use which agent.
create table if not exists public.agent_permissions (
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_slug text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, agent_slug)
);

create index if not exists agent_permissions_slug_idx on public.agent_permissions(agent_slug);

alter table public.agent_permissions enable row level security;

-- agent_memory: durable per-user files (voice samples, style preferences, frequent-correspondents).
-- Lightweight key/value: one row per (user, agent, filename).
create table if not exists public.agent_memory (
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_slug text not null,
  filename text not null,
  content text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, agent_slug, filename)
);

alter table public.agent_memory enable row level security;

-- agent_conversations: one row per chat session.
create table if not exists public.agent_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_slug text not null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_conversations_user_idx
  on public.agent_conversations(user_id, agent_slug, updated_at desc);

alter table public.agent_conversations enable row level security;

-- agent_messages: ordered transcript of each conversation.
-- content_json holds the raw Anthropic content blocks (text, tool_use, tool_result) so we can replay loops faithfully.
create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.agent_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists agent_messages_conversation_idx
  on public.agent_messages(conversation_id, created_at);

alter table public.agent_messages enable row level security;

-- Seed Gage with email-drafter access.
insert into public.agent_permissions (user_id, agent_slug, enabled)
select id, 'email-drafter', true
  from auth.users
 where email = 'gspolansky@amitiscapital.com'
on conflict (user_id, agent_slug) do update set enabled = true;
