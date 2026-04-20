/**
 * Types for the dynamic module schema (aligned with specifiche_moduli_e_architettura.md).
 */

/** i18n object: locale key -> string (v1: it only) */
export type I18n = { it: string };

/** Condition for showIf / requiredIf */
export type ConditionOp =
  | 'eq'
  | 'neq'
  | 'in'
  | 'notIn'
  | 'contains'
  | 'notContains'
  | 'intersects'
  | 'notIntersects'
  | 'empty'
  | 'notEmpty';

export interface Condition {
  field: string;
  op: ConditionOp;
  value?: unknown;
}

/** Field types supported in v1 */
export type FieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'checkbox-group'
  | 'switch'
  | 'date'
  | 'notice';

export type NoticeVariant = 'info' | 'warning' | 'error';

/** Option for select/radio (optional in v1) */
export interface FieldOption {
  value: string;
  label: I18n;
  enabledIf?: Condition;
}

/** Solo per `type: 'select'`: opzione «Altro»; testo in `{fieldId}_other`. */
export interface SelectOtherConfig {
  enabled: boolean;
  value?: string;
  label?: I18n;
  placeholder?: I18n;
}

export interface Field {
  id: string;
  type: FieldType;
  label: I18n;
  placeholder?: I18n;
  required: boolean;
  validation?: string;
  showIf?: Condition;
  requiredIf?: Condition;
  options?: FieldOption[];
  selectOther?: SelectOtherConfig;
  noticeVariant?: NoticeVariant;
  noticeText?: I18n;
  min?: number;
  max?: number;
}

export interface StepRepeatConfig {
  countFieldId: string;
  minCount?: number;
  maxCount?: number;
}

export interface Step {
  id: string;
  title: I18n;
  fields: Field[];
  repeatFromField?: StepRepeatConfig;
}

export interface ThankYou {
  title: I18n;
  body: I18n;
  notes: I18n;
}

export interface Meta {
  title: I18n;
  description: I18n;
  thankYou: ThankYou;
}

/**
 * Tariffe per `{{ riepilogo }}` nel body email (solo backend; il public non invia prezzi).
 * @see docs/email-submission-templates.md
 */
export interface RiepilogoPricing {
  iscrizioneBaseEur?: number;
  euroPerSettimanaSelezionata?: number;
  tesseramentoNoiNuovoEur?: number;
  tesseramentoFieldId?: string;
  tesseramentoWhenValue?: string;
  scontoFamigliaNumerosaEur?: number;
  prezziGiteByOptionValue?: Record<string, number>;
}

/** Email dopo submit (solo lato backend); opzionale. @see docs/email-submission-templates.md */
/** Limiti iscrizione sede × settimana (conteggio lato server). */
export interface EnrollmentCapacity {
  enabled: boolean;
  sedeFieldId: string;
  weekFieldIds: string[];
  weekParticipationValue?: string;
  limitsBySede: Record<string, Record<string, number>>;
}

/** Capienza gite per opzione (`fieldId` -> `option.value` -> limite). */
export interface TripCapacity {
  enabled: boolean;
  limitsByField: Record<string, Record<string, number>>;
}

export interface EmailOnSubmit {
  enabled: boolean;
  templateFile: string;
  to?: string[];
  /** ID campo email nel modulo: destinatario aggiunto dal valore in submit. */
  toFieldId?: string;
  subject: string;
  body: string;
  attachDocxToo: boolean;
  /** Allegati extra in `email_templates/` sul server (non compilati). */
  staticAttachmentFiles?: string[];
  /** Tariffe per il riepilogo email (solo se usi `{{ riepilogo }}` nel body). */
  riepilogoPricing?: RiepilogoPricing;
}

export interface Module {
  id: string;
  /** Public URL segment when set (see backend schema). */
  guid?: string;
  version: number;
  meta: Meta;
  steps: Step[];
  emailOnSubmit?: EmailOnSubmit;
  enrollmentCapacity?: EnrollmentCapacity;
  tripCapacity?: TripCapacity;
}
