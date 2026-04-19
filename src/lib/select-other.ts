import type { Field } from '@/types/module';

export const DEFAULT_SELECT_OTHER_VALUE = '__other__';

/** Lunghezza massima testo «Altro» (allineata al backend). */
export const SELECT_OTHER_TEXT_MAX_LEN = 500;

/** Valore sintetico inviato nel select quando è attiva l’opzione Altro. */
export function selectOtherSentinel(field: Field): string | null {
  if (field.type !== 'select' || !field.selectOther?.enabled) return null;
  const v = field.selectOther.value?.trim();
  return v && v.length > 0 ? v : DEFAULT_SELECT_OTHER_VALUE;
}

/** Chiave in `responses` per il testo libero (es. `campo_0_other` in step ripetuto). */
export function selectOtherTextKey(formKey: string): string {
  return `${formKey}_other`;
}
