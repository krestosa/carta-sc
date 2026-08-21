export interface EditorialState {
  sentenceStart: boolean;
  words: number;
}

export const CONTENT_LOCALE = 'es-AR' as const;

const CONNECTORS = new Set([
  'a', 'al', 'ante', 'bajo', 'con', 'contra', 'de', 'del', 'desde', 'durante', 'e', 'el', 'en', 'entre',
  'hacia', 'hasta', 'la', 'las', 'los', 'mediante', 'ni', 'o', 'para', 'por', 'que', 'según', 'sin', 'sobre',
  'su', 'sus', 'tras', 'tu', 'tus', 'u', 'un', 'una', 'unos', 'unas', 'y',
]);

const PROTECTED_WORDS: Readonly<Record<string, string>> = Object.freeze({
  aqa: 'AQA',
  sushiclub: 'SushiClub',
});

const WORD_PATTERN = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+(?:['’][A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+)*/g;
const SENTENCE_BOUNDARY_PATTERN = /[.!?¡¿:]/;
const LEADING_NUMBER_PATTERN = /^\d/;

export function cleanTitlePeriods(value: string): string {
  return value.replace(/\./g, (period, index, source) => {
    const previous = source.charAt(index - 1);
    const next = source.charAt(index + 1);
    return /\d/.test(previous) && /\d/.test(next) ? period : '';
  });
}

function capitalize(value: string): string {
  const protectedValue = PROTECTED_WORDS[value];
  if (protectedValue) return protectedValue;
  return value.replace(/[a-záéíóúüñ]/i, (letter) => letter.toLocaleUpperCase(CONTENT_LOCALE));
}

export function applyEditorialCase(value: string, state: EditorialState, removePeriods = false): string {
  const source = removePeriods ? cleanTitlePeriods(value) : value;
  let output = '';
  let lastIndex = 0;
  WORD_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = WORD_PATTERN.exec(source))) {
    const separator = source.slice(lastIndex, match.index);
    output += separator;
    if (SENTENCE_BOUNDARY_PATTERN.test(separator)) state.sentenceStart = true;

    const raw = match[0] ?? '';
    const lower = raw.toLocaleLowerCase(CONTENT_LOCALE);
    const normalized = LEADING_NUMBER_PATTERN.test(raw)
      ? lower
      : CONNECTORS.has(lower) && !state.sentenceStart
        ? lower
        : capitalize(lower);

    output += normalized;
    state.sentenceStart = false;
    state.words += 1;
    lastIndex = WORD_PATTERN.lastIndex;
  }

  return output + source.slice(lastIndex);
}
