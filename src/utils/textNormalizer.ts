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
  return makeSearchHighlightRegExp(tokens);
}

function makeSearchHighlightRegExp(tokens: string[]): RegExp {
  const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(${escaped.join('[\\W]*?')})`, 'gi');
}

export function findBestSearchMatch(
  text: string,
  query: string,
): { regex: RegExp; tokenCount: number } | null {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);

  for (let length = tokens.length; length > 0; length--) {
    for (let start = 0; start <= tokens.length - length; start++) {
      const regex = makeSearchHighlightRegExp(tokens.slice(start, start + length));
      regex.lastIndex = 0;
      if (regex.test(text)) return { regex, tokenCount: length };
    }
  }

  return null;
}

/**
 * Finds the slide with the longest contiguous match of query tokens. This
 * also handles a query that crosses a slide boundary by choosing the slide
 * containing the largest matching portion. Returns 0 when nothing matches.
 */
export function findMatchSlideIndex(
  slides: Array<{ lines?: string[]; text?: string }> | undefined,
  query: string,
): number {
  if (!slides || slides.length === 0 || !query.trim()) return 0;

  let bestIndex = 0;
  let bestTokenCount = 0;
  slides.forEach((slide, index) => {
    const text = slide.lines?.join('\n') ?? slide.text ?? '';
    const match = findBestSearchMatch(text, query);
    if (match && match.tokenCount > bestTokenCount) {
      bestIndex = index;
      bestTokenCount = match.tokenCount;
    }
  });
  return bestIndex;
}
