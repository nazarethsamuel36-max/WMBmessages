# Search Text Normalization Migration

## Overview

This migration adds a `normalized_text` column to the `paragraphs` table to optimize search performance. The original sermon text remains unchanged for display purposes, while the normalized text is used exclusively for searching.

## What Changed

### Database Schema
- Added `normalized_text TEXT NOT NULL` column to `paragraphs` table
- Added index on `normalized_text` for search performance

### Code Changes
- Created `src/utils/textNormalizer.ts` - reusable normalization utility
- Updated `src/services/messageService.ts` - search now uses `normalized_text` column
- Updated `src/search/searchIntent.ts` - all search handlers normalize queries
- Rendering components continue to use original `text` field (unchanged)

## Normalization Rules (Version 1)

The `normalizeText()` function applies these rules:
1. **Lowercase**: Convert all characters to lowercase
2. **Remove punctuation**: Strip . , ! ? ; : " ' ( ) [ ] { } - _ + = * & ^ % $ # @ ~ ` |
3. **Trim whitespace**: Remove leading/trailing spaces
4. **Collapse spaces**: Replace multiple spaces with single space

Example:
```
Original: "And The Bride Shall Come."
Normalized: "and the bride shall come"
```

## Migration Steps

### Step 1: Run SQL Migration

Execute the SQL file to add the column and index:

```bash
# Using Supabase dashboard SQL editor
# Or via CLI:
psql -h your-host -U your-user -d your-database -f migrations/add_normalized_text.sql
```

Or run directly in Supabase SQL Editor:
```sql
-- migrations/add_normalized_text.sql
ALTER TABLE paragraphs 
ADD COLUMN IF NOT EXISTS normalized_text TEXT;

CREATE INDEX IF NOT EXISTS idx_paragraphs_normalized_text ON paragraphs(normalized_text);
```

### Step 2: Populate Normalized Text

Run the migration script to populate `normalized_text` for existing paragraphs:

```bash
node migrations/populate_normalized_text.js
```

This script:
- Fetches all existing paragraphs in batches of 100
- Normalizes each paragraph's text
- Updates the `normalized_text` column
- Reports progress and any errors

### Step 3: Verify Migration

Check that the migration completed successfully:

```sql
-- Verify column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'paragraphs' 
AND column_name = 'normalized_text';

-- Verify data is populated
SELECT COUNT(*) as total_paragraphs,
       COUNT(normalized_text) as normalized_count
FROM paragraphs;

-- Sample normalized data
SELECT id, 
       LEFT(text, 50) as original_preview,
       LEFT(normalized_text, 50) as normalized_preview
FROM paragraphs
LIMIT 5;
```

## Future Inserts

All future paragraph inserts must include both `text` and `normalized_text`:

```typescript
import { normalizeText } from '../utils/textNormalizer';

const originalText = "And The Bride Shall Come.";
const normalizedText = normalizeText(originalText);

await supabase.from('paragraphs').insert({
  book_id: messageId,
  paragraph_no: paragraphNumber,
  text: originalText,
  normalized_text: normalizedText
});
```

## Search Flow

### Before (Old Flow)
```
User Input
  ↓
Search paragraphs
  ↓
Normalize every paragraph during search (expensive)
  ↓
Compare
```

### After (New Flow)
```
User Input
  ↓
normalizeText(query) once
  ↓
Search pre-normalized normalized_text column (fast)
  ↓
Results
```

## Performance Benefits

- **Single normalization**: Query normalized once instead of normalizing every paragraph
- **Indexed search**: `normalized_text` column is indexed for fast lookups
- **Scalable**: Performance remains consistent as dataset grows
- **Future-proof**: Foundation for stemming, synonyms, fuzzy search without schema changes

## Important Notes

- **Original text preserved**: The `text` column remains unchanged - all rendering uses original text
- **Normalized text hidden**: Users never see `normalized_text` - it's for search only
- **Backward compatible**: Existing rendering code unchanged
- **Version 1**: Intentionally simple normalization - can be enhanced later

## Rollback

If needed, you can rollback by:
```sql
DROP INDEX IF EXISTS idx_paragraphs_normalized_text;
ALTER TABLE paragraphs DROP COLUMN IF EXISTS normalized_text;
```

Then revert code changes to use `text` column for search again.
