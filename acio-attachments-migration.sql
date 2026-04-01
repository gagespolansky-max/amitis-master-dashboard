-- Email attachments metadata for ACIO deals
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS acio_email_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES acio_deals(id) ON DELETE CASCADE,
  deal_email_id uuid REFERENCES acio_deal_emails(id) ON DELETE SET NULL,
  gmail_message_id text NOT NULL,
  gmail_attachment_id text NOT NULL,
  filename text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  size integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(deal_id, gmail_message_id, gmail_attachment_id)
);

CREATE INDEX IF NOT EXISTS idx_acio_email_attachments_deal ON acio_email_attachments(deal_id);
