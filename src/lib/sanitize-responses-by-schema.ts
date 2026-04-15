import type { Field, Module, Step } from '@/types/module';
import { evaluateCondition } from '@/lib/conditions';
import { computeRepeatCount, makeConditionGetValue } from '@/lib/repeat-steps';

export interface RemovedOptionEntry {
  fieldId: string;
  value: string;
}

export interface SanitizeResponsesResult {
  responses: Record<string, unknown>;
  removed: RemovedOptionEntry[];
}

function enabledOptionValues(
  field: Field,
  getValue: (fieldId: string) => unknown
): Set<string> {
  const options = field.options ?? [];
  return new Set(
    options
      .filter((opt) => !opt.enabledIf || evaluateCondition(opt.enabledIf, getValue))
      .map((opt) => opt.value)
  );
}

function sanitizeFieldInContext(
  field: Field,
  storageKey: string,
  getValue: (fieldId: string) => unknown,
  state: Record<string, unknown>,
  removed: RemovedOptionEntry[]
): boolean {
  if (field.type !== 'radio' && field.type !== 'checkbox-group') return false;
  const enabled = enabledOptionValues(field, getValue);

  if (field.type === 'radio') {
    const current = state[storageKey];
    if (typeof current === 'string' && current !== '' && !enabled.has(current)) {
      removed.push({ fieldId: storageKey, value: current });
      state[storageKey] = '';
      return true;
    }
    return false;
  }

  const current = state[storageKey];
  if (!Array.isArray(current) || current.length === 0) return false;
  const selected = current.filter((v): v is string => typeof v === 'string');
  const filtered = selected.filter((v) => enabled.has(v));
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
  removed: RemovedOptionEntry[]
): boolean {
  const getValue = makeConditionGetValue(state, step, repeatIndex);
  let changed = false;
  for (const field of step.fields) {
    const key =
      repeatIndex !== null && step.repeatFromField
        ? `${field.id}_${repeatIndex}`
        : field.id;
    if (sanitizeFieldInContext(field, key, getValue, state, removed)) changed = true;
  }
  return changed;
}

export function sanitizeResponsesBySchema(
  module: Pick<Module, 'steps'>,
  responses: Record<string, unknown>
): SanitizeResponsesResult {
  const state = { ...responses };
  const removed: RemovedOptionEntry[] = [];

  // Fixpoint pass: clearing one value can disable other dependent options.
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;

    for (const step of module.steps) {
      if (!step.repeatFromField) {
        if (sanitizeStepContext(step, null, state, removed)) changed = true;
        continue;
      }

      const count = computeRepeatCount(state, step.repeatFromField);
      for (let i = 0; i < count; i++) {
        if (sanitizeStepContext(step, i, state, removed)) changed = true;
      }
    }

    if (!changed) break;
  }

  return { responses: state, removed };
}
