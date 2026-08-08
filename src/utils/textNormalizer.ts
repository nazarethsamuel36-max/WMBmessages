/**
 * Text Normalization Utility
 *
 * Produces a search-only version of paragraph text.
 * Result is NEVER used for display — only for searching.
 *
 * Transformations applied (in order):
 *  1. Convert to lowercase
 *  2. Replace NBSP and soft-hyphen with a regular space
 *  3. Strip Unicode smart/curly quotes  (" " ' ')
 *  4. Strip ellipsis character (…) and standard dots
 *  5. Strip em dash, en dash, minus, hyphen
 *  6. Strip all remaining ASCII punctuation
 *  7. Trim leading/trailing whitespace
 *  8. Collapse multiple spaces into a single space
 */
export function normalizeText(text: string): string {
  if (!text) return '';

  let n = text;

  // 1. Lowercase
  n = n.toLowerCase();

  // 2. Non-breaking space (U+00A0) and soft hyphen (U+00AD) → regular space
  n = n.replace(/[\u00A0\u00AD]/g, ' ');

  // 3. Unicode smart / curly quotes → nothing
  //    " (U+201C)  " (U+201D)  ' (U+2018)  ' (U+2019)
  n = n.replace(/[\u2018\u2019\u201C\u201D]/g, '');

  // 4. Ellipsis (U+2026) → nothing
  n = n.replace(/\u2026/g, '');

  // 5. Em dash (U+2014) and en dash (U+2013) → space (so words don't merge)
  n = n.replace(/[\u2013\u2014]/g, ' ');

  // 6. All remaining ASCII punctuation → nothing
  //    Covers: . , ! ? ; : " ' ( ) [ ] { } - _ + = * & ^ % $ # @ ~ ` | / \ < >
  n = n.replace(/[.,!?;:"'()\[\]{}\-_+=*&^%$#@~`|/\\<>]/g, '');

  // 7. Trim
  n = n.trim();

  // 8. Collapse multiple spaces
  n = n.replace(/\s+/g, ' ');

  return n;
}

/**
 * Builds a case-insensitive regexp from a raw user query that matches the
 * ORIGINAL (punctuated) paragraph text even when the query omits punctuation.
 *
 * The query is normalized first, then whitespace/punctuation between the
 * resulting words is treated as flexible, so e.g. "worshipper coming doing"
 * matches "The worshipper coming, doing the work.".
 *
 * Returns null when the query contains no searchable words. The single
 * capturing group lets split() isolate matched spans for <mark> rendering.
 */
export function buildSearchHighlightRegExp(query: string): RegExp | null {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;
  const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(${escaped.join('[\\W]*?')})`, 'gi');
}

/**
 * Finds the index of the first slide whose text contains a match for the
 * given query. Slide lines are joined and tested against the same
 * normalized regex used for highlighting, so the match slide aligns with
 * the highlighted span. Returns 0 when no match or no query is provided.
 */
export function findMatchSlideIndex(
  slides: Array<{ lines?: string[]; text?: string }> | undefined,
  query: string,
): number {
  if (!slides || slides.length === 0 || !query.trim()) return 0;

  const regex = buildSearchHighlightRegExp(query);
  if (!regex) return 0;

  const idx = slides.findIndex(slide => {
    const text = slide.lines?.join('\n') ?? slide.text ?? '';
    regex.lastIndex = 0;
    return regex.test(text);
  });
  return idx >= 0 ? idx : 0;
}
