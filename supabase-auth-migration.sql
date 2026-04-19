-- Per-user Gmail OAuth refresh tokens.
-- Read/written only by service-role (no user policies → RLS blocks all user access).
CREATE TABLE IF NOT EXISTS user_gmail_credentials (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  refresh_token text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  last_refreshed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_gmail_credentials ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_gmail_credentials_email
  ON user_gmail_credentials(email);

-- Attribution columns on shared deal pool.
ALTER TABLE acio_deals
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_edited_by_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_edited_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_acio_deals_created_by
  ON acio_deals(created_by_user_id);
