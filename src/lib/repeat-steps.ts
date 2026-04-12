import type { Field, Module, Step, StepRepeatConfig } from '@/types/module';
import type { GetFieldValue } from '@/lib/conditions';
import { evaluateCondition } from '@/lib/conditions';

/** Una “schermata” di navigazione: step logico + eventuale indice ripetizione. */
export interface VirtualStep {
  stepIndex: number;
  step: Step;
  /** `null` = step senza repeat; altrimenti 0..N-1 */
  repeatIndex: number | null;
  /** true se repeat con N=0: nessun campo, solo messaggio */
  emptyRepeat: boolean;
  /** Se `emptyRepeat`, perché (messaggio UX). */
  emptyRepeatReason?: RepeatSkipReason;
}

export function defaultValueForField(field: Field): unknown {
  if (field.type === 'checkbox' || field.type === 'switch') return false;
  if (field.type === 'checkbox-group') return [];
  if (field.type === 'number') return '';
  return '';
}

type ParsedCount =
  | { kind: 'empty' }
  | { kind: 'invalid' }
  | { kind: 'ok'; n: number };

function parseCountRaw(raw: unknown): ParsedCount {
  if (
    raw === undefined ||
    raw === null ||
    (typeof raw === 'string' && raw.trim() === '')
  ) {
    return { kind: 'empty' };
  }
  const n =
    typeof raw === 'number' && !Number.isNaN(raw)
      ? Math.trunc(raw)
      : parseInt(String(raw ?? '').trim(), 10);
  if (Number.isNaN(n)) return { kind: 'invalid' };
  return { kind: 'ok', n };
}

/**
 * Calcola N dal valore di countFieldId, clamp min/max, N >= 0.
 */
export function computeRepeatCount(
  values: Record<string, unknown>,
  config: StepRepeatConfig
): number {
  const parsed = parseCountRaw(values[config.countFieldId]);
  if (parsed.kind === 'empty' || parsed.kind === 'invalid') return 0;
  let n = parsed.n;
  const lo = config.minCount ?? Number.NEGATIVE_INFINITY;
  const hi = config.maxCount ?? Number.POSITIVE_INFINITY;
  n = Math.min(hi, Math.max(lo, n));
  return Math.max(0, n);
}

/** Motivo per cui uno step con `repeatFromField` non ha istanze (N=0). */
export type RepeatSkipReason = 'zero' | 'invalid' | 'empty';

/**
 * Per messaggi UX quando `emptyRepeat` è true (N=0 dopo clamp).
 */
export function repeatSkipReason(
  values: Record<string, unknown>,
  config: StepRepeatConfig
): RepeatSkipReason {
  const parsed = parseCountRaw(values[config.countFieldId]);
  if (parsed.kind === 'empty') return 'empty';
  if (parsed.kind === 'invalid') return 'invalid';
  return 'zero';
}

/** Chiave storage: `id` oppure `id_0`, `id_1`, … */
export function fieldFormKey(
  fieldId: string,
  step: Step,
  repeatIndex: number | null
): string {
  if (repeatIndex === null || !step.repeatFromField) return fieldId;
  return `${fieldId}_${repeatIndex}`;
}

/**
 * Risolve i valori per showIf/requiredIf: campi dello stesso step ripetuto usano il suffisso `_repeatIndex`.
 */
export function makeConditionGetValue(
  values: Record<string, unknown>,
  step: Step,
  repeatIndex: number | null
): GetFieldValue {
  const stepFieldIds = new Set(step.fields.map((f) => f.id));
  return (id: string) => {
    if (
      repeatIndex !== null &&
      step.repeatFromField &&
      stepFieldIds.has(id)
    ) {
      return values[`${id}_${repeatIndex}`];
    }
    return values[id];
  };
}

export function expandVirtualSteps(
  module: Module,
  values: Record<string, unknown>
): VirtualStep[] {
  const out: VirtualStep[] = [];
  for (let si = 0; si < module.steps.length; si++) {
    const step = module.steps[si];
    if (!step.repeatFromField) {
      out.push({
        stepIndex: si,
        step,
        repeatIndex: null,
        emptyRepeat: false,
      });
      continue;
    }
    const N = computeRepeatCount(values, step.repeatFromField);
    if (N === 0) {
      out.push({
        stepIndex: si,
        step,
        repeatIndex: null,
        emptyRepeat: true,
        emptyRepeatReason: repeatSkipReason(values, step.repeatFromField),
      });
    } else {
      for (let i = 0; i < N; i++) {
        out.push({
          stepIndex: si,
          step,
          repeatIndex: i,
          emptyRepeat: false,
        });
      }
    }
  }
  return out;
}

/** Campi visibili con risoluzione condizioni nel contesto repeat. */
export function getVisibleFieldsForContext(
  step: Step,
  values: Record<string, unknown>,
  repeatIndex: number | null
): Field[] {
  const getValue = makeConditionGetValue(values, step, repeatIndex);
  return step.fields.filter(
    (f) => !f.showIf || evaluateCondition(f.showIf, getValue)
  );
}
