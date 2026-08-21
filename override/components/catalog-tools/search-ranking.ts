import type { SearchItem } from './search-domain.js';

export function normalizeSearchText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function fieldMatches(text: string, query: string, tokens: readonly string[]): boolean {
  return text.includes(query) || tokens.every((token) => text.includes(token));
}

export function rankSearchItem(item: SearchItem, query: string, tokens: readonly string[]): number {
  if (!query) return 0;
  if (item.title === query) return 0;
  if (item.title.startsWith(query)) return 1;
  if (item.title.includes(query)) return 2;
  if (fieldMatches(item.title, query, tokens)) return 3;
  if (item.description === query) return 4;
  if (item.description.startsWith(query)) return 5;
  if (item.description.includes(query)) return 6;
  if (fieldMatches(item.description, query, tokens)) return 7;
  return fieldMatches(item.text, query, tokens) ? 8 : -1;
}
