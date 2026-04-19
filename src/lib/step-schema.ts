import { z } from 'zod';
import type { Step, Field } from '@/types/module';
import { evaluateCondition } from './conditions';
import { getValidator } from './validation-registry';
import type { GetFieldValue } from './conditions';
import { makeConditionGetValue } from './repeat-steps';

function isFieldRequired(
  field: Field,
  getValue: GetFieldValue
): boolean {
  if (field.required) return true;
  if (field.requiredIf) return evaluateCondition(field.requiredIf, getValue);
  return false;
}

function baseTypeForField(field: Field): z.ZodTypeAny {
  switch (field.type) {
    case 'number':
      return z.union([z.number(), z.nan(), z.string().transform(Number)]);
    case 'checkbox':
    case 'switch':
      return z.boolean();
    case 'checkbox-group':
      return z.array(z.string());
    default:
      return z.union([z.string(), z.number(), z.boolean(), z.array(z.unknown())]);
  }
}

export interface BuildStepSchemaOptions {
  /** Indice ripetizione per suffissi `_i`; `null` se step non ripetuto */
  repeatIndex: number | null;
}

/**
 * Costruisce lo schema Zod per uno step (eventualmente con chiavi suffissate `_i`).
 */
export function buildStepSchema(
  step: Step,
  values: Record<string, unknown>,
  options?: BuildStepSchemaOptions
) {
  const repeatIndex = options?.repeatIndex ?? null;
  const inRepeat = repeatIndex !== null && !!step.repeatFromField;

  const keyFor = (fieldId: string) =>
    inRepeat ? `${fieldId}_${repeatIndex}` : fieldId;

  const getValuePreview: GetFieldValue = makeConditionGetValue(
    values,
    step,
    repeatIndex
  );
  const visibleFields = step.fields.filter(
    (f) => !f.showIf || evaluateCondition(f.showIf, getValuePreview)
  );

  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of visibleFields) {
    shape[keyFor(f.id)] = baseTypeForField(f).optional();
  }

  return z.object(shape).passthrough().superRefine((data, ctx) => {
    const merged = { ...values, ...data } as Record<string, unknown>;
    const getValue = makeConditionGetValue(merged, step, repeatIndex);

    for (const f of visibleFields) {
      const storageKey = keyFor(f.id);
      const val = merged[storageKey];
      const required = isFieldRequired(f, getValue);
      const validator = getValidator(f.validation);

      if (required) {
        const empty =
          val === undefined ||
          val === null ||
          val === '' ||
          (Array.isArray(val) && val.length === 0);
        if (empty) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [storageKey],
            message: 'Campo obbligatorio',
          });
          continue;
        }
      }

      if (val !== undefined && val !== null && val !== '') {
        if (f.type === 'radio' || f.type === 'select') {
          const enabledOptions = (f.options ?? []).filter(
            (opt) => !opt.enabledIf || evaluateCondition(opt.enabledIf, getValue)
          );
          const allowedValues = enabledOptions.map((opt) => opt.value);
          if (typeof val !== 'string' || !allowedValues.includes(val)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [storageKey],
              message: 'Selezione non disponibile',
            });
            continue;
          }
        }
        if (f.type === 'checkbox-group') {
          const enabledOptions = (f.options ?? []).filter(
            (opt) => !opt.enabledIf || evaluateCondition(opt.enabledIf, getValue)
          );
          const allowedValues = new Set(enabledOptions.map((opt) => opt.value));
          if (
            !Array.isArray(val) ||
            val.some((v) => typeof v !== 'string' || !allowedValues.has(v))
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [storageKey],
              message: 'Selezione non disponibile',
            });
            continue;
          }
        }

        if (!validator(val)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [storageKey],
            message: 'Valore non valido',
          });
        }
      }

      if (f.type === 'number' && (f.min !== undefined || f.max !== undefined)) {
        const raw = merged[storageKey];
        if (raw !== undefined && raw !== null && raw !== '') {
          const n = typeof raw === 'number' ? raw : Number(raw);
          if (Number.isFinite(n)) {
            if (f.min !== undefined && n < f.min) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [storageKey],
                message: `Valore minimo: ${f.min}`,
              });
            }
            if (f.max !== undefined && n > f.max) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [storageKey],
                message: `Valore massimo: ${f.max}`,
              });
            }
          }
        }
      }
    }
  });
}
