-- ============================================================================
-- Data Layer Attio participant identities
--
-- Every call participant receives:
-- - company_identity_id: the firm/company side of the identity
-- - person_identity_id: the individual side of the identity
-- - participant_identity_id: deterministic hash of company + person
--
-- Attio IDs are preferred when present. Email/domain-derived IDs are fallback
-- identities when Attio does not expose a per-participant person/company ID.
-- ============================================================================

create extension if not exists pgcrypto;

alter table public.call_participants add column if not exists company_identity_id text;
alter table public.call_participants add column if not exists person_identity_id text;
alter table public.call_participants add column if not exists participant_identity_id text;

with participant_keys as (
  select
    id,
    case
      when lower(split_part(email, '@', 2)) in ('amitiscapital.com', 'theamitisgroup.com') then 'domain:amitiscapital.com'
      when attio_company_id is not null then 'attio_company:' || attio_company_id
      when email is not null and split_part(email, '@', 2) <> '' then 'domain:' || lower(split_part(email, '@', 2))
      when firm_name is not null and btrim(firm_name) <> '' then 'company_name:' || regexp_replace(lower(btrim(firm_name)), '\s+', '-', 'g')
      else 'company:unknown'
    end as company_id,
    case
      when attio_person_id is not null then 'attio_person:' || attio_person_id
      when email is not null and btrim(email) <> '' then 'email:' || lower(btrim(email))
      when display_name is not null and btrim(display_name) <> '' then 'person_name:' || regexp_replace(lower(btrim(display_name)), '\s+', '-', 'g')
      else 'person:unknown'
    end as person_id
  from public.call_participants
)
update public.call_participants cp
set
  company_identity_id = participant_keys.company_id,
  person_identity_id = participant_keys.person_id,
  participant_identity_id = 'participant:' || substr(encode(digest(participant_keys.company_id || '|' || participant_keys.person_id, 'sha256'), 'hex'), 1, 32)
from participant_keys
where cp.id = participant_keys.id
  and (
    cp.company_identity_id is null
    or cp.person_identity_id is null
    or cp.participant_identity_id is null
  );

create index if not exists call_participants_company_identity_idx
  on public.call_participants(company_identity_id) where company_identity_id is not null;
create index if not exists call_participants_person_identity_idx
  on public.call_participants(person_identity_id) where person_identity_id is not null;
create index if not exists call_participants_composite_identity_idx
  on public.call_participants(participant_identity_id) where participant_identity_id is not null;
