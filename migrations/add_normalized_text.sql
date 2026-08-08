-- Migration: Add normalized_text column to paragraphs table
-- This adds a column for storing normalized text used for search optimization

-- Add the normalized_text column
ALTER TABLE paragraphs 
ADD COLUMN IF NOT EXISTS normalized_text TEXT;

-- Trigram index for ILIKE '%...%' substring search on normalized_text.
-- A plain btree index cannot be used for leading-wildcard ILIKE; without this
-- index every search does a full table scan (213k+ rows) which exceeds the
-- anon role's statement timeout (~3s) and returns error 57014.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP INDEX IF EXISTS idx_paragraphs_normalized_text;
CREATE INDEX IF NOT EXISTS idx_paragraphs_normalized_text_trgm
  ON paragraphs USING gin (normalized_text gin_trgm_ops);
