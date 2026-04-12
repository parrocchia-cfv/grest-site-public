import type { I18n } from '@/types/module';

const DEFAULT_LOCALE = 'it' as const;

/**
 * Returns the label for the given locale, falling back to 'it'.
 * v1: locale is always 'it'; structure is i18n-ready for future locales.
 */
export function getLabel(obj: I18n | undefined, locale: string = DEFAULT_LOCALE): string {
  if (!obj) return '';
  return (obj as Record<string, string>)[locale] ?? obj.it ?? '';
}
