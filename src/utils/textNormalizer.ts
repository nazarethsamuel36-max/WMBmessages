/**
 * Text Normalization Utility
 * 
 * Normalizes text for search optimization by:
 * 1. Converting to lowercase
 * 2. Trimming leading/trailing whitespace
 * 3. Collapsing multiple spaces into single space
 * 4. Removing punctuation
 * 
 * This is Version 1 - intentionally simple for performance.
 * Future versions may add stemming, lemmatization, etc.
 */

export function normalizeText(text: string): string {
  if (!text) return '';
  
  // Step 1: Convert to lowercase
  let normalized = text.toLowerCase();
  
  // Step 2: Remove punctuation (Version 1 - simple removal)
  // Removes: . , ! ? ; : " ' ( ) [ ] { } - _ + = * & ^ % $ # @ ~ ` |
  normalized = normalized.replace(/[.,!?;:"'()\[\]{}\-_+=*&^%$#@~`|]/g, '');
  
  // Step 3: Trim leading/trailing whitespace
  normalized = normalized.trim();
  
  // Step 4: Collapse multiple spaces into single space
  normalized = normalized.replace(/\s+/g, ' ');
  
  return normalized;
}
