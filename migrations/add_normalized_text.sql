-- Migration: Add normalized_text column to paragraphs table
-- This adds a column for storing normalized text used for search optimization

-- Add the normalized_text column
ALTER TABLE paragraphs 
ADD COLUMN IF NOT EXISTS normalized_text TEXT;

-- Add index for search performance on normalized_text
CREATE INDEX IF NOT EXISTS idx_paragraphs_normalized_text ON paragraphs(normalized_text);
