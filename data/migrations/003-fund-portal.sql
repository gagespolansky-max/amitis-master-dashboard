-- Fund Doc Search: managers, source documents, and embedded chunks.
-- Runtime run/file-event logs intentionally live in local SQLite at
-- data/fund_indexing_log.db, not in Supabase.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS fund_managers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  legal_name      TEXT,
  legal_name_confidence TEXT CHECK (legal_name_confidence IN ('high','medium','low')),
  legal_name_confirmed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fund_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id         UUID NOT NULL REFERENCES fund_managers(id) ON DELETE CASCADE,
  filepath        TEXT NOT NULL,
  filename        TEXT NOT NULL,
  source_root     TEXT NOT NULL CHECK (source_root IN ('subscriptions','manager_materials','ic_materials')),
  doc_type        TEXT NOT NULL,
  content_hash    TEXT NOT NULL,
  is_authoritative BOOLEAN NOT NULL DEFAULT FALSE,
  byte_size       BIGINT,
  page_count      INTEGER,
  extracted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE (fund_id, filepath)
);

ALTER TABLE fund_documents
  DROP CONSTRAINT IF EXISTS fund_documents_source_root_check;

ALTER TABLE fund_documents
  ADD CONSTRAINT fund_documents_source_root_check
  CHECK (source_root IN ('subscriptions','manager_materials','ic_materials'));

CREATE INDEX IF NOT EXISTS idx_fund_documents_fund
  ON fund_documents(fund_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fund_documents_doctype
  ON fund_documents(fund_id, doc_type)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS fund_document_chunks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES fund_documents(id) ON DELETE CASCADE,
  fund_id         UUID NOT NULL REFERENCES fund_managers(id) ON DELETE CASCADE,
  doc_type        TEXT NOT NULL,
  chunk_index     INTEGER NOT NULL,
  locator_kind    TEXT NOT NULL CHECK (locator_kind IN ('page','section','sheet_row','row_range','table','none')),
  locator_value   TEXT,
  is_table_chunk  BOOLEAN NOT NULL DEFAULT FALSE,
  token_count     INTEGER,
  text            TEXT NOT NULL,
  embedding       vector(1536) NOT NULL,
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_chunks_fund
  ON fund_document_chunks(fund_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_chunks_doctype
  ON fund_document_chunks(fund_id, doc_type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw
  ON fund_document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fund_managers_touch ON fund_managers;
CREATE TRIGGER trg_fund_managers_touch
  BEFORE UPDATE ON fund_managers
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Atomic replacement prevents stale chunk rows when a changed document produces
-- fewer chunks than the previous extraction.
CREATE OR REPLACE FUNCTION replace_fund_document_chunks(
  p_fund_id UUID,
  p_filepath TEXT,
  p_filename TEXT,
  p_source_root TEXT,
  p_doc_type TEXT,
  p_content_hash TEXT,
  p_is_authoritative BOOLEAN,
  p_byte_size BIGINT,
  p_page_count INTEGER,
  p_chunks JSONB
) RETURNS UUID AS $$
DECLARE
  v_document_id UUID;
BEGIN
  INSERT INTO fund_documents (
    fund_id,
    filepath,
    filename,
    source_root,
    doc_type,
    content_hash,
    is_authoritative,
    byte_size,
    page_count,
    extracted_at,
    deleted_at
  )
  VALUES (
    p_fund_id,
    p_filepath,
    p_filename,
    p_source_root,
    p_doc_type,
    p_content_hash,
    p_is_authoritative,
    p_byte_size,
    p_page_count,
    now(),
    NULL
  )
  ON CONFLICT (fund_id, filepath) DO UPDATE SET
    filename = EXCLUDED.filename,
    source_root = EXCLUDED.source_root,
    doc_type = EXCLUDED.doc_type,
    content_hash = EXCLUDED.content_hash,
    is_authoritative = EXCLUDED.is_authoritative,
    byte_size = EXCLUDED.byte_size,
    page_count = EXCLUDED.page_count,
    extracted_at = now(),
    deleted_at = NULL
  RETURNING id INTO v_document_id;

  DELETE FROM fund_document_chunks
  WHERE document_id = v_document_id;

  INSERT INTO fund_document_chunks (
    document_id,
    fund_id,
    doc_type,
    chunk_index,
    locator_kind,
    locator_value,
    is_table_chunk,
    token_count,
    text,
    embedding,
    embedding_model,
    deleted_at
  )
  SELECT
    v_document_id,
    p_fund_id,
    p_doc_type,
    COALESCE((chunk_item->>'chunk_index')::INTEGER, ordinality::INTEGER - 1),
    COALESCE(NULLIF(chunk_item->>'locator_kind', ''), 'none'),
    NULLIF(chunk_item->>'locator_value', ''),
    COALESCE((chunk_item->>'is_table_chunk')::BOOLEAN, FALSE),
    NULLIF(chunk_item->>'token_count', '')::INTEGER,
    chunk_item->>'text',
    ((chunk_item->'embedding')::TEXT)::vector,
    COALESCE(NULLIF(chunk_item->>'embedding_model', ''), 'text-embedding-3-small'),
    NULL
  FROM jsonb_array_elements(COALESCE(p_chunks, '[]'::jsonb)) WITH ORDINALITY AS chunks(chunk_item, ordinality);

  RETURN v_document_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION soft_delete_missing_fund_documents(
  p_fund_id UUID,
  p_seen_filepaths TEXT[]
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH changed AS (
    UPDATE fund_documents
    SET deleted_at = now()
    WHERE fund_id = p_fund_id
      AND deleted_at IS NULL
      AND NOT (filepath = ANY(COALESCE(p_seen_filepaths, ARRAY[]::TEXT[])))
    RETURNING id
  ),
  changed_chunks AS (
    UPDATE fund_document_chunks
    SET deleted_at = now()
    WHERE document_id IN (SELECT id FROM changed)
      AND deleted_at IS NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM changed;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION match_fund_document_chunks(
  p_fund_slug TEXT,
  p_query_embedding TEXT,
  p_match_count INTEGER DEFAULT 20,
  p_doc_types TEXT[] DEFAULT NULL,
  p_exclude_doc_types TEXT[] DEFAULT ARRAY[]::TEXT[]
) RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  fund_id UUID,
  filepath TEXT,
  filename TEXT,
  source_root TEXT,
  doc_type TEXT,
  chunk_index INTEGER,
  locator_kind TEXT,
  locator_value TEXT,
  is_table_chunk BOOLEAN,
  token_count INTEGER,
  text TEXT,
  similarity DOUBLE PRECISION
) AS $$
  SELECT
    c.id AS chunk_id,
    c.document_id,
    c.fund_id,
    d.filepath,
    d.filename,
    d.source_root,
    c.doc_type,
    c.chunk_index,
    c.locator_kind,
    c.locator_value,
    c.is_table_chunk,
    c.token_count,
    c.text,
    1 - (c.embedding <=> p_query_embedding::vector) AS similarity
  FROM fund_document_chunks c
  JOIN fund_documents d ON d.id = c.document_id
  JOIN fund_managers fm ON fm.id = c.fund_id
  WHERE fm.slug = p_fund_slug
    AND c.deleted_at IS NULL
    AND d.deleted_at IS NULL
    AND (p_doc_types IS NULL OR c.doc_type = ANY(p_doc_types))
    AND (
      p_exclude_doc_types IS NULL
      OR array_length(p_exclude_doc_types, 1) IS NULL
      OR NOT (c.doc_type = ANY(p_exclude_doc_types))
    )
  ORDER BY c.embedding <=> p_query_embedding::vector
  LIMIT LEAST(GREATEST(COALESCE(p_match_count, 20), 1), 200);
$$ LANGUAGE sql STABLE;
