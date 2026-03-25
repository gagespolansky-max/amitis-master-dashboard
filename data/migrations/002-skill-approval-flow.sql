-- Skill Approval Flow Migration
-- Run in Supabase SQL Editor

alter table skill_proposals add column if not exists type text default 'idea';
alter table skill_proposals add column if not exists submitted_skill_md text;
alter table skill_proposals add column if not exists submitted_from text;
alter table skill_proposals add column if not exists reviewed_by text;
alter table skill_proposals add column if not exists reviewed_at timestamptz;
alter table skill_proposals add column if not exists rejection_reason text;

-- Add 'pending_review', 'approved', 'rejected' to the status options
-- (no enum constraint exists, status is just text)

-- Index for filtering submissions
create index if not exists idx_skill_proposals_type_status on skill_proposals(type, status);
