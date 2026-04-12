/**
 * Validation: Strategy + registry (contratti_e_convenzioni.md §3).
 * JSON has a string (e.g. "codice_fiscale"); registry maps to validator function.
 */

export const VALIDATION_TYPES = [
  'generic',
  'nome_it',
  'cognome_it',
  'codice_fiscale',
  'partita_iva',
  'email',
  'telefono_it',
  'cap_it',
] as const;

export type ValidationType = (typeof VALIDATION_TYPES)[number];

export type ValidatorFn = (value: unknown) => boolean;

const ITALIAN_NAME_REGEX = /^[a-zA-Z\u00C0-\u024F\s']+$/;
const MAX_NAME_LENGTH = 100;

const CODICE_FISCALE_REGEX = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i;

const PARTITA_IVA_REGEX = /^[0-9]{11}$/;

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const TELEFONO_IT_REGEX = /^(\+39)?[\s.-]?[0-9]{2,4}[\s.-]?[0-9]{6,8}$/;

const CAP_IT_REGEX = /^[0-9]{5}$/;

function generic(value: unknown): boolean {
  return true;
}

function nome_it(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const t = value.trim();
  return t.length > 0 && t.length <= MAX_NAME_LENGTH && ITALIAN_NAME_REGEX.test(t);
}

function cognome_it(value: unknown): boolean {
  return nome_it(value);
}

function codice_fiscale(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const s = value.trim().toUpperCase();
  return s.length === 16 && CODICE_FISCALE_REGEX.test(s);
}

function partita_iva(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return PARTITA_IVA_REGEX.test(value.replace(/\s/g, ''));
}

function email(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return EMAIL_REGEX.test(value.trim());
}

function telefono_it(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const s = value.replace(/\s/g, '').replace(/\./g, '').replace(/-/g, '');
  return TELEFONO_IT_REGEX.test(s) && s.replace(/\D/g, '').length >= 9;
}

function cap_it(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return CAP_IT_REGEX.test(value.replace(/\s/g, ''));
}

const validators: Record<ValidationType, ValidatorFn> = {
  generic,
  nome_it,
  cognome_it,
  codice_fiscale,
  partita_iva,
  email,
  telefono_it,
  cap_it,
};

/**
 * Returns the validator for the given validation key from JSON.
 * Fallback to generic if key is unknown.
 */
export function getValidator(key: string | undefined): ValidatorFn {
  if (!key) return validators.generic;
  const k = key as ValidationType;
  return VALIDATION_TYPES.includes(k) ? validators[k] : validators.generic;
}

export const validationRegistry = validators;
