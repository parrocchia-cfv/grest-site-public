import type { Field, Module, Step } from '@/types/module';
import { evaluateCondition } from '@/lib/conditions';
import { computeRepeatCount, makeConditionGetValue } from '@/lib/repeat-steps';
import { selectOtherSentinel } from '@/lib/select-other';

export interface RemovedOptionEntry {
  fieldId: string;
  value: string;
}

export interface SanitizeResponsesResult {
  responses: Record<string, unknown>;
  removed: RemovedOptionEntry[];
}

function isHardCapacityDisabledOption(field: Field, value: string): boolean {
  return (field.options ?? []).some((o) => o.value === value && o.enabled === false);
}

function enabledOptionValues(
  field: Field,
  getValue: (fieldId: string) => unknown
): Set<string> {
  const options = field.options ?? [];
  const set = new Set(
    options
      .filter(
        (opt) =>
          opt.enabled !== false &&
          (!opt.enabledIf || evaluateCondition(opt.enabledIf, getValue))
      )
      .map((opt) => opt.value)
  );
  if (field.type === 'select') {
    const ov = selectOtherSentinel(field);
    if (ov) set.add(ov);
  }
  return set;
}

function sanitizeFieldInContext(
  field: Field,
  storageKey: string,
  getValue: (fieldId: string) => unknown,
  state: Record<string, unknown>,
  removed: RemovedOptionEntry[],
  keepHardDisabledSelections: boolean
): boolean {
  if (field.type === 'notice') {
    return false;
  }
  if (field.type !== 'radio' && field.type !== 'checkbox-group' && field.type !== 'select') {
    return false;
  }
  const enabled = enabledOptionValues(field, getValue);

  if (field.type === 'radio' || field.type === 'select') {
    const current = state[storageKey];
    if (
      typeof current === 'string' &&
      current !== '' &&
      !enabled.has(current) &&
      !(keepHardDisabledSelections && isHardCapacityDisabledOption(field, current))
    ) {
      removed.push({ fieldId: storageKey, value: current });
      state[storageKey] = '';
      const otherKey = `${storageKey}_other`;
      if (state[otherKey] !== undefined && String(state[otherKey]).trim() !== '') {
        state[otherKey] = '';
      }
      return true;
    }
    if (field.type === 'select' && field.selectOther?.enabled) {
      const ov = selectOtherSentinel(field);
      if (ov) {
        const cur = state[storageKey];
        if (typeof cur !== 'string' || cur !== ov) {
          const otherKey = `${storageKey}_other`;
          if (state[otherKey] !== undefined && String(state[otherKey]).trim() !== '') {
            state[otherKey] = '';
            return true;
          }
        }
      }
    }
    return false;
  }

  const current = state[storageKey];
  if (!Array.isArray(current) || current.length === 0) return false;
  const selected = current.filter((v): v is string => typeof v === 'string');
  const filtered = selected.filter(
    (v) => enabled.has(v) || (keepHardDisabledSelections && isHardCapacityDisabledOption(field, v))
  );
  if (filtered.length !== selected.length) {
    for (const val of selected) {
      if (!enabled.has(val)) removed.push({ fieldId: storageKey, value: val });
    }
    state[storageKey] = filtered;
    return true;
  }
  return false;
}

function sanitizeStepContext(
  step: Step,
  repeatIndex: number | null,
  state: Record<string, unknown>,
  removed: RemovedOptionEntry[],
  keepHardDisabledSelections: boolean
): boolean {
  const getValue = makeConditionGetValue(state, step, repeatIndex);
  let changed = false;
  for (const field of step.fields) {
    const key =
      repeatIndex !== null && step.repeatFromField
        ? `${field.id}_${repeatIndex}`
        : field.id;
    if (sanitizeFieldInContext(field, key, getValue, state, removed, keepHardDisabledSelections))
      changed = true;
  }
  return changed;
}

export interface SanitizeResponsesOptions {
  /**
   * Modifica iscrizione: non rimuove valori su opzioni con `enabled: false`
   * (es. posti esauriti nella sede), così restano visibili e disselezionabili.
   */
  keepHardDisabledSelections?: boolean;
}

export function sanitizeResponsesBySchema(
  module: Pick<Module, 'steps'>,
  responses: Record<string, unknown>,
  options?: SanitizeResponsesOptions
): SanitizeResponsesResult {
  const state = { ...responses };
  const removed: RemovedOptionEntry[] = [];
  const keepHard = Boolean(options?.keepHardDisabledSelections);

  // Fixpoint pass: clearing one value can disable other dependent options.
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;

    for (const step of module.steps) {
      if (!step.repeatFromField) {
        if (sanitizeStepContext(step, null, state, removed, keepHard)) changed = true;
        continue;
      }

      const count = computeRepeatCount(state, step.repeatFromField);
      for (let i = 0; i < count; i++) {
        if (sanitizeStepContext(step, i, state, removed, keepHard)) changed = true;
      }
    }

    if (!changed) break;
  }

  return { responses: state, removed };
}
