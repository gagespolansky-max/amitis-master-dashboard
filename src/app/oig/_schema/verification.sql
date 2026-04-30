-- ============================================================================
-- OIG Phase 1 — verification queries
-- Run after applying 001_foundation.sql + seed.sql to confirm the schema
-- supports the queries Audit and Chief of Staff will rely on.
--
-- Each query is independent. Run them one at a time in the Supabase SQL editor
-- (or via mcp__supabase__execute_sql).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Open action items with full context (owner, requester, org, source).
-- This is the bread-and-butter query Chief of Staff will run.
-- ----------------------------------------------------------------------------
select
  ai.id,
  ai.title,
  ai.priority,
  ai.due_date,
  ai.status,
  owner.full_name        as owner_name,
  requester.full_name    as requested_by,
  org.name               as organization,
  i.source_type,
  i.source_id,
  i.title                as source_subject
from public.action_items ai
left join public.people        owner     on owner.id     = ai.owner_person_id
left join public.people        requester on requester.id = ai.requested_by_person_id
join      public.interactions  i         on i.id         = ai.interaction_id
left join public.organizations org       on org.id       = i.org_id
where ai.status not in ('done', 'dropped')
order by ai.priority desc nulls last, ai.due_date asc nulls last;

-- ----------------------------------------------------------------------------
-- 2. Overdue action items (status open/in_progress/blocked, due_date < today).
-- ----------------------------------------------------------------------------
select
  ai.id,
  ai.title,
  ai.priority,
  ai.due_date,
  current_date - ai.due_date as days_overdue,
  owner.full_name as owner_name,
  org.name as organization
from public.action_items ai
left join public.people        owner on owner.id = ai.owner_person_id
join      public.interactions  i     on i.id     = ai.interaction_id
left join public.organizations org   on org.id   = i.org_id
where ai.status not in ('done', 'dropped')
  and ai.due_date is not null
  and ai.due_date < current_date
order by ai.due_date asc;

-- ----------------------------------------------------------------------------
-- 3. Stale high-priority items: open, priority high or critical, no update in 7+ days.
-- ----------------------------------------------------------------------------
select
  ai.id,
  ai.title,
  ai.priority,
  ai.status,
  ai.updated_at,
  age(now(), ai.updated_at) as time_since_update,
  owner.full_name as owner_name
from public.action_items ai
left join public.people owner on owner.id = ai.owner_person_id
where ai.status not in ('done', 'dropped')
  and ai.priority in ('high', 'critical')
  and ai.updated_at < now() - interval '7 days'
order by ai.updated_at asc;

-- ----------------------------------------------------------------------------
-- 4. Open action items missing an owner.
-- ----------------------------------------------------------------------------
select
  ai.id,
  ai.title,
  ai.priority,
  ai.due_date,
  i.source_type,
  org.name as organization
from public.action_items ai
join      public.interactions  i   on i.id   = ai.interaction_id
left join public.organizations org on org.id = i.org_id
where ai.status not in ('done', 'dropped')
  and ai.owner_person_id is null
order by ai.priority desc nulls last;

-- ----------------------------------------------------------------------------
-- 5. Items by owner, soonest due first.
-- Replace the email filter with whichever person you want to scope to.
-- ----------------------------------------------------------------------------
select
  ai.id,
  ai.title,
  ai.priority,
  ai.due_date,
  ai.status
from public.action_items ai
join public.people p on p.id = ai.owner_person_id
where lower(p.email) = 'gspolansky@amitiscapital.com'
  and ai.status not in ('done', 'dropped')
order by ai.due_date asc nulls last, ai.priority desc nulls last;

-- ----------------------------------------------------------------------------
-- 6. Items by organization (e.g., everything related to Acme).
-- ----------------------------------------------------------------------------
select
  ai.id,
  ai.title,
  ai.priority,
  ai.status,
  ai.due_date,
  i.source_type,
  i.title as source_subject
from public.action_items ai
join public.interactions  i   on i.id   = ai.interaction_id
join public.organizations org on org.id = i.org_id
where lower(org.name) = 'acme holdings'
order by ai.created_at desc;

-- ----------------------------------------------------------------------------
-- 7. Unresolved audit findings, severity-ordered.
-- ----------------------------------------------------------------------------
select
  f.id,
  f.severity,
  f.finding_type,
  f.title,
  f.details,
  f.related_action_item_id,
  f.related_person_id,
  f.related_org_id,
  f.created_at
from public.audit_findings f
where f.resolved_at is null
order by
  case f.severity
    when 'critical' then 1
    when 'high'     then 2
    when 'medium'   then 3
    when 'low'      then 4
  end,
  f.created_at desc;

-- ----------------------------------------------------------------------------
-- 8. Source traceability: a single interaction with all its action items + tags.
-- Replace the source_id with whichever interaction you want to drill into.
-- ----------------------------------------------------------------------------
with target as (
  select id from public.interactions
  where source_type = 'gmail' and source_id = 'gmail-msg-0001'
)
select
  i.title as interaction_title,
  i.clean_summary,
  i.occurred_at,
  ai.title as action_title,
  ai.status,
  ai.due_date,
  array_agg(distinct it.tag) filter (where it.tag is not null) as interaction_tags,
  array_agg(distinct ait.tag) filter (where ait.tag is not null) as action_tags
from target t
join      public.interactions      i   on i.id  = t.id
left join public.action_items      ai  on ai.interaction_id  = i.id
left join public.interaction_tags  it  on it.interaction_id  = i.id
left join public.action_item_tags  ait on ait.action_item_id = ai.id
group by i.title, i.clean_summary, i.occurred_at, ai.title, ai.status, ai.due_date
order by ai.due_date nulls last;

-- ----------------------------------------------------------------------------
-- 9. Tag rollups (which tags are most active right now).
-- ----------------------------------------------------------------------------
select
  ait.tag,
  count(*) as open_count
from public.action_item_tags ait
join public.action_items ai on ai.id = ait.action_item_id
where ai.status not in ('done', 'dropped')
group by ait.tag
order by open_count desc, ait.tag asc;

-- ----------------------------------------------------------------------------
-- 10. Vector recall sanity check.
-- Confirms pgvector is wired and the cosine operator works.
-- Plug in a real 1536-dim embedding to do a real semantic search.
-- ----------------------------------------------------------------------------
select
  i.id,
  i.title,
  i.embedding <=> ('[' || array_to_string(array_fill(0::float, array[1536]), ',') || ']')::vector
    as distance_to_zero_vector
from public.interactions i
where i.embedding is not null
limit 5;
