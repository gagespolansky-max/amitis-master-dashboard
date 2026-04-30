-- ============================================================================
-- OIG Phase 1 — realistic seed data for testing the schema.
--
-- Apply ONLY to a dev environment or right after the migration on a fresh DB.
-- Designed to exercise: open / overdue / stale / done states, owner & org
-- linkage, source traceability, tags, and audit findings.
--
-- Rerunnable: every insert is guarded by `on conflict do nothing` where
-- there's a natural key, otherwise wrapped to upsert by name/email.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Organizations
-- ----------------------------------------------------------------------------
insert into public.organizations (id, name, domain, org_type)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Acme Holdings',  'acme.example.com',  'customer'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Bridge Capital', 'bridgecap.example', 'prospect'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Amitis Capital', 'amitiscapital.com', 'internal')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- People
-- ----------------------------------------------------------------------------
insert into public.people (id, full_name, email, company_id, role, relationship_type)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Sarah Chen',    'sarah@acme.example.com',  'aaaaaaaa-0000-0000-0000-000000000001', 'CFO',          'primary_contact'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Marcus Patel',  'marcus@acme.example.com', 'aaaaaaaa-0000-0000-0000-000000000001', 'Investor Rel', 'secondary_contact'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'Jamie Vasquez', 'jamie@bridgecap.example', 'aaaaaaaa-0000-0000-0000-000000000002', 'Partner',      'lead_prospect'),
  ('bbbbbbbb-0000-0000-0000-000000000004', 'Gage Spolansky','gspolansky@amitiscapital.com','aaaaaaaa-0000-0000-0000-000000000003', 'Associate',    'self')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Interactions
-- ----------------------------------------------------------------------------
insert into public.interactions
  (id, source_type, source_id, thread_id, occurred_at, title, raw_text, clean_summary,
   interaction_type, priority, urgency, status, org_id, primary_person_id)
values
  -- Gmail email from Sarah, 3 days ago, awaiting reply.
  ('cccccccc-0000-0000-0000-000000000001',
   'gmail', 'gmail-msg-0001', 'gmail-thread-0001',
   now() - interval '3 days',
   'Q4 reporting package — questions on fee accrual',
   'Hi Gage, working through the Q4 package. Two questions on the fee accrual...',
   'Sarah at Acme is asking about Q4 fee accrual line items and needs a response before their board meeting next week.',
   'email', 'high', 'high', 'open',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000001'),

  -- Attio note from Bridge intro call, 8 days ago.
  ('cccccccc-0000-0000-0000-000000000002',
   'attio', 'attio-note-0001', null,
   now() - interval '8 days',
   'Bridge Capital — intro call notes',
   'Met with Jamie. Looking at $5M tickets in middle-market funds. Interested in our credit strategy.',
   'Bridge Capital is a warm prospect; Jamie wants the credit-strategy deck and a follow-up call within two weeks.',
   'call', 'medium', 'medium', 'open',
   'aaaaaaaa-0000-0000-0000-000000000002',
   'bbbbbbbb-0000-0000-0000-000000000003'),

  -- Older Gmail thread, already resolved.
  ('cccccccc-0000-0000-0000-000000000003',
   'gmail', 'gmail-msg-0002', 'gmail-thread-0002',
   now() - interval '21 days',
   'Q3 reporting package — sent',
   'Sending Q3 reports as discussed.',
   'Q3 reporting package was delivered to Acme.',
   'email', 'medium', 'low', 'archived',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Action items
-- ----------------------------------------------------------------------------
insert into public.action_items
  (id, interaction_id, title, description,
   owner_person_id, requested_by_person_id,
   due_date, status, priority, category, confidence,
   completed_at)
values
  -- Open + due in 2 days. Highest priority.
  ('dddddddd-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000001',
   'Reply to Sarah on Q4 fee accrual',
   'Address her two questions on the fee accrual section before her board meeting.',
   'bbbbbbbb-0000-0000-0000-000000000004',
   'bbbbbbbb-0000-0000-0000-000000000001',
   (current_date + interval '2 days')::date,
   'open', 'high', 'reply_needed', 0.95,
   null),

  -- Overdue (was due 3 days ago).
  ('dddddddd-0000-0000-0000-000000000002',
   'cccccccc-0000-0000-0000-000000000001',
   'Send updated fee schedule appendix to Acme',
   'Acme needs the appendix attached to the next Q4 update.',
   'bbbbbbbb-0000-0000-0000-000000000004',
   'bbbbbbbb-0000-0000-0000-000000000001',
   (current_date - interval '3 days')::date,
   'open', 'high', 'deliverable', 0.9,
   null),

  -- In progress, no due date.
  ('dddddddd-0000-0000-0000-000000000003',
   'cccccccc-0000-0000-0000-000000000002',
   'Send credit-strategy deck to Bridge',
   'Pull the latest credit deck and email Jamie.',
   'bbbbbbbb-0000-0000-0000-000000000004',
   'bbbbbbbb-0000-0000-0000-000000000003',
   null,
   'in_progress', 'medium', 'deliverable', 0.85,
   null),

  -- Stale (open 9 days, no movement, low priority — should surface in audit).
  ('dddddddd-0000-0000-0000-000000000004',
   'cccccccc-0000-0000-0000-000000000002',
   'Schedule follow-up call with Bridge',
   'Aim for the second week of next month.',
   null,
   'bbbbbbbb-0000-0000-0000-000000000003',
   null,
   'open', 'low', 'scheduling', 0.6,
   null),

  -- Done (historical).
  ('dddddddd-0000-0000-0000-000000000005',
   'cccccccc-0000-0000-0000-000000000003',
   'Send Q3 reporting package',
   'Delivered with cover note.',
   'bbbbbbbb-0000-0000-0000-000000000004',
   'bbbbbbbb-0000-0000-0000-000000000001',
   (current_date - interval '21 days')::date,
   'done', 'medium', 'deliverable', 1.0,
   now() - interval '21 days')
on conflict (id) do nothing;

-- Backdate the stale item's updated_at to make stale-detection queries pass.
update public.action_items
   set updated_at = now() - interval '9 days'
 where id = 'dddddddd-0000-0000-0000-000000000004';

-- ----------------------------------------------------------------------------
-- Tags
-- ----------------------------------------------------------------------------
insert into public.interaction_tags (interaction_id, tag) values
  ('cccccccc-0000-0000-0000-000000000001', 'gmail'),
  ('cccccccc-0000-0000-0000-000000000001', 'investor'),
  ('cccccccc-0000-0000-0000-000000000001', 'urgent'),
  ('cccccccc-0000-0000-0000-000000000002', 'attio'),
  ('cccccccc-0000-0000-0000-000000000002', 'sales'),
  ('cccccccc-0000-0000-0000-000000000003', 'gmail'),
  ('cccccccc-0000-0000-0000-000000000003', 'investor')
on conflict do nothing;

insert into public.action_item_tags (action_item_id, tag) values
  ('dddddddd-0000-0000-0000-000000000001', 'reply_needed'),
  ('dddddddd-0000-0000-0000-000000000001', 'urgent'),
  ('dddddddd-0000-0000-0000-000000000002', 'deliverable'),
  ('dddddddd-0000-0000-0000-000000000002', 'deadline_risk'),
  ('dddddddd-0000-0000-0000-000000000003', 'deliverable'),
  ('dddddddd-0000-0000-0000-000000000004', 'scheduling'),
  ('dddddddd-0000-0000-0000-000000000004', 'no_owner'),
  ('dddddddd-0000-0000-0000-000000000004', 'stale')
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Audit findings (one open, one resolved historical)
-- ----------------------------------------------------------------------------
insert into public.audit_findings
  (id, finding_type, severity, title, details,
   related_action_item_id, related_person_id, related_org_id,
   resolved_at)
values
  ('eeeeeeee-0000-0000-0000-000000000001',
   'overdue_action', 'high',
   'Action item overdue by 3 days',
   'Send updated fee schedule appendix to Acme — past due, owner Gage Spolansky.',
   'dddddddd-0000-0000-0000-000000000002',
   'bbbbbbbb-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   null),
  ('eeeeeeee-0000-0000-0000-000000000002',
   'no_owner', 'medium',
   'Open action item with no owner',
   'Schedule follow-up call with Bridge — open 9 days, no assigned owner.',
   'dddddddd-0000-0000-0000-000000000004',
   'bbbbbbbb-0000-0000-0000-000000000003',
   'aaaaaaaa-0000-0000-0000-000000000002',
   null)
on conflict (id) do nothing;
