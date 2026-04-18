import type { I18n } from '@/types/module';

const DEFAULT_LOCALE = 'it' as const;

/**
 * Converte sequenze letterali `\\n` / `\\r\\n` (come salvate in JSON) in a capo reali.
 * I newline già presenti nel testo restano invariati.
 */
export function normalizeLineBreaks(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n');
}

/** Per Typography / label MUI: mostra i newline del testo i18n. */
export const multilineI18nSx = { whiteSpace: 'pre-line' as const };

/**
 * Returns the label for the given locale, falling back to 'it'.
 * v1: locale is always 'it'; structure is i18n-ready for future locales.
 */
export function getLabel(obj: I18n | undefined, locale: string = DEFAULT_LOCALE): string {
  if (!obj) return '';
  const raw = (obj as Record<string, string>)[locale] ?? obj.it ?? '';
  return normalizeLineBreaks(raw);
}
