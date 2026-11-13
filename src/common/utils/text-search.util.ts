export const MAX_SEARCH_WORDS = 8;

const MIN_PARTIAL_MATCH_LENGTH = 4;

const STEM_ENDING = /^[aeiouàèéìòù](?:n?[aeiouàèéìòù])?s?$/u;

export function searchWords(search: string | undefined): string[] {
  return [
    ...new Set(
      (search ?? '')
        .toLowerCase()
        .split(/[^\p{L}\p{N}'’-]+/u)
        .filter((word) => /[\p{L}\p{N}]/u.test(word)),
    ),
  ].slice(0, MAX_SEARCH_WORDS);
}

function searchStem(term: string): string {
  const lower = term.toLowerCase();
  return lower.length >= MIN_PARTIAL_MATCH_LENGTH
    ? lower.replace(/[aeiouàèéìòù]$/u, '')
    : lower;
}

export function textWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0);
}

function isWordMatch(word: string, part: string): boolean {
  if (part.length < MIN_PARTIAL_MATCH_LENGTH) {
    return word.startsWith(part) && word.length - part.length <= 1;
  }
  const stem = searchStem(part);
  return (
    word.startsWith(part) ||
    (word.startsWith(stem) && STEM_ENDING.test(word.slice(stem.length)))
  );
}

export function hasWordMatch(text: string, term: string): boolean {
  const words = textWords(text);
  const parts = textWords(term);
  return (
    parts.length > 0 &&
    parts.every((part) => words.some((word) => isWordMatch(word, part)))
  );
}

export function searchPrefix(term: string): string {
  const [longest] = textWords(term).sort((a, b) => b.length - a.length);
  return longest ? searchStem(longest) : '';
}
