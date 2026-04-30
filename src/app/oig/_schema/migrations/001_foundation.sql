-- ============================================================================
-- OIG Phase 1 Foundation
-- Operations Intelligence Engine — shared memory layer.
-- See src/app/oig/_schema/README.md for context.
--
-- This migration creates the structured memory backbone that future agents
-- (Triage, Audit, Chief of Staff) will read from and write to. SQL data is
-- the operational source of truth; embeddings support fuzzy/semantic recall.
--
-- Apply via: Supabase SQL Editor, the Supabase MCP tool, or supabase CLI.
-- Re-running is safe: every CREATE/ALTER guards against duplicates.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists vector;     -- pgvector for embeddings

-- ----------------------------------------------------------------------------
-- Enums (prefixed `oig_` to avoid collisions with future generic types)
-- ----------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'oig_source_type') then
    create type oig_source_type as enum ('gmail', 'slack', 'attio', 'tacd_iq', 'manual');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'oig_interaction_type') then
    create type oig_interaction_type as enum (
      'email', 'thread', 'dm', 'call', 'meeting', 'transcript', 'note'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'oig_action_status') then
    create type oig_action_status as enum (
      'open', 'in_progress', 'blocked', 'done', 'dropped'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'oig_priority') then
    create type oig_priority as enum ('low', 'medium', 'high', 'critical');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'oig_audit_severity') then
    create type oig_audit_severity as enum ('low', 'medium', 'high', 'critical');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'oig_org_type') then
    create type oig_org_type as enum (
      'customer', 'prospect', 'investor', 'partner', 'vendor', 'internal'
    );
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Shared updated_at trigger function
-- ----------------------------------------------------------------------------
create or replace function public.oig_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- organizations
-- ============================================================================
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  domain      text,
  org_type    oig_org_type,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists organizations_domain_idx on public.organizations(domain);
create index if not exists organizations_name_idx on public.organizations(lower(name));
create index if not exists organizations_type_idx on public.organizations(org_type);

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.oig_set_updated_at();

alter table public.organizations enable row level security;

-- ============================================================================
-- people
-- ============================================================================
create table if not exists public.people (
  id                  uuid primary key default gen_random_uuid(),
  full_name           text not null,
  email               text,
  slack_user_id       text,
  company_id          uuid references public.organizations(id) on delete set null,
  role                text,
  relationship_type   text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index if not exists people_email_unique
  on public.people(lower(email)) where email is not null;
create index if not exists people_company_idx on public.people(company_id);
create index if not exists people_slack_idx on public.people(slack_user_id) where slack_user_id is not null;
create index if not exists people_name_idx on public.people(lower(full_name));

drop trigger if exists people_set_updated_at on public.people;
create trigger people_set_updated_at
  before update on public.people
  for each row execute function public.oig_set_updated_at();

alter table public.people enable row level security;

-- ============================================================================
-- interactions
-- Every external touchpoint (email, call, dm, transcript, note) lands here.
-- ============================================================================
create table if not exists public.interactions (
  id                  uuid primary key default gen_random_uuid(),
  source_type         oig_source_type not null,
  source_id           text not null,
  thread_id           text,
  occurred_at         timestamptz not null,
  title               text,
  raw_text            text,
  clean_summary       text,
  embedding           vector(1536),
  interaction_type    oig_interaction_type,
  priority            oig_priority,
  urgency             oig_priority,
  status              text not null default 'open',
  org_id              uuid references public.organizations(id) on delete set null,
  primary_person_id   uuid references public.people(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- A single source record (e.g., a Gmail message) maps to one interaction.
create unique index if not exists interactions_source_unique
  on public.interactions(source_type, source_id);

create index if not exists interactions_thread_idx on public.interactions(thread_id) where thread_id is not null;
create index if not exists interactions_occurred_idx on public.interactions(occurred_at desc);
create index if not exists interactions_status_idx on public.interactions(status);
create index if not exists interactions_priority_idx on public.interactions(priority);
create index if not exists interactions_urgency_idx on public.interactions(urgency);
create index if not exists interactions_org_idx on public.interactions(org_id);
create index if not exists interactions_person_idx on public.interactions(primary_person_id);
create index if not exists interactions_source_type_idx on public.interactions(source_type);

-- Vector index. ivfflat with 100 lists is reasonable for tens of thousands of rows.
-- Bump `lists` (sqrt(rows)) once the table grows materially; reindex with `reindex index`.
create index if not exists interactions_embedding_idx
  on public.interactions
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

drop trigger if exists interactions_set_updated_at on public.interactions;
create trigger interactions_set_updated_at
  before update on public.interactions
  for each row execute function public.oig_set_updated_at();

alter table public.interactions enable row level security;

-- ============================================================================
-- action_items
-- Every actionable thing extracted from an interaction. Hard FK on interaction_id
-- enforces source traceability — no orphan action items.
-- ============================================================================
create table if not exists public.action_items (
  id                      uuid primary key default gen_random_uuid(),
  interaction_id          uuid not null references public.interactions(id) on delete cascade,
  title                   text not null,
  description             text,
  embedding               vector(1536),
  owner_person_id         uuid references public.people(id) on delete set null,
  requested_by_person_id  uuid references public.people(id) on delete set null,
  due_date                date,
  status                  oig_action_status not null default 'open',
  priority                oig_priority,
  category                text,
  confidence              numeric(3, 2)
                          check (confidence is null or (confidence >= 0 and confidence <= 1)),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  completed_at            timestamptz,
  -- Invariant: completed_at MUST be set when status is 'done', and null otherwise.
  constraint action_items_completed_at_consistency
    check (
      (status = 'done' and completed_at is not null) or
      (status <> 'done' and completed_at is null)
    )
);

create index if not exists action_items_interaction_idx on public.action_items(interaction_id);
create index if not exists action_items_owner_idx on public.action_items(owner_person_id);
create index if not exists action_items_status_idx on public.action_items(status);
create index if not exists action_items_priority_idx on public.action_items(priority);
create index if not exists action_items_category_idx on public.action_items(category);

-- Composite index for the most common query: open items, by owner, soonest due first.
create index if not exists action_items_open_owner_due_idx
  on public.action_items(owner_person_id, due_date)
  where status not in ('done', 'dropped');

-- Partial index for "anything still open with a due date" — drives overdue queries.
create index if not exists action_items_open_due_idx
  on public.action_items(due_date)
  where status not in ('done', 'dropped') and due_date is not null;

create index if not exists action_items_updated_idx on public.action_items(updated_at desc);

create index if not exists action_items_embedding_idx
  on public.action_items
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

drop trigger if exists action_items_set_updated_at on public.action_items;
create trigger action_items_set_updated_at
  before update on public.action_items
  for each row execute function public.oig_set_updated_at();

alter table public.action_items enable row level security;

-- ============================================================================
-- interaction_tags / action_item_tags
-- Free-text tag families documented in 02-data-model.md (source/business/action/risk).
-- Plain text — application code controls the vocabulary.
-- ============================================================================
create table if not exists public.interaction_tags (
  interaction_id  uuid not null references public.interactions(id) on delete cascade,
  tag             text not null,
  created_at      timestamptz not null default now(),
  primary key (interaction_id, tag)
);
create index if not exists interaction_tags_tag_idx on public.interaction_tags(tag);
alter table public.interaction_tags enable row level security;

create table if not exists public.action_item_tags (
  action_item_id  uuid not null references public.action_items(id) on delete cascade,
  tag             text not null,
  created_at      timestamptz not null default now(),
  primary key (action_item_id, tag)
);
create index if not exists action_item_tags_tag_idx on public.action_item_tags(tag);
alter table public.action_item_tags enable row level security;

-- ============================================================================
-- audit_findings
-- Output of the Audit Agent (Phase 4+). Each finding is anchored to whichever
-- entity it concerns — a person, org, action item, or interaction — any/all may
-- be null but at least one should be set in practice.
-- ============================================================================
create table if not exists public.audit_findings (
  id                       uuid primary key default gen_random_uuid(),
  finding_type             text not null,
  severity                 oig_audit_severity not null,
  title                    text not null,
  details                  text,
  related_person_id        uuid references public.people(id) on delete set null,
  related_org_id           uuid references public.organizations(id) on delete set null,
  related_action_item_id   uuid references public.action_items(id) on delete set null,
  related_interaction_id   uuid references public.interactions(id) on delete set null,
  created_at               timestamptz not null default now(),
  resolved_at              timestamptz
);

create index if not exists audit_findings_severity_idx on public.audit_findings(severity);
create index if not exists audit_findings_type_idx on public.audit_findings(finding_type);
create index if not exists audit_findings_unresolved_idx
  on public.audit_findings(created_at desc)
  where resolved_at is null;
create index if not exists audit_findings_action_item_idx on public.audit_findings(related_action_item_id);
create index if not exists audit_findings_person_idx on public.audit_findings(related_person_id);
create index if not exists audit_findings_org_idx on public.audit_findings(related_org_id);
create index if not exists audit_findings_interaction_idx on public.audit_findings(related_interaction_id);

alter table public.audit_findings enable row level security;

-- ============================================================================
-- RLS posture
-- All seven tables have RLS enabled with NO policies, matching the existing
-- master-dashboard pattern: API routes use the service-role key (which bypasses
-- RLS); anon and authenticated users have no direct access. Auth gating happens
-- in middleware + per-route checks, not at the row level.
--
-- If/when we expose any of these tables to client SDKs directly, add explicit
-- policies here in a follow-up migration (002_*.sql).
-- ============================================================================
