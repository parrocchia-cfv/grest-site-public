import type { EnrollmentCapacity, Module } from '@/types/module';

export interface EnrollmentSnapshotSlot {
  limit: number;
  confirmed: number;
  remaining: number;
  waitlist: number;
}

/** Risposta GET /api/modules/{guid}/enrollment-snapshot */
export interface EnrollmentSnapshot {
  enabled: boolean;
  sedeFieldId?: string;
  weekFieldIds?: string[];
  weekParticipationValue?: string;
  slots?: Record<string, Record<string, EnrollmentSnapshotSlot>>;
}

export interface TripSnapshotSlot {
  limit: number;
  confirmed: number;
  remaining: number;
  waitlist: number;
}

export interface TripCapacitySnapshot {
  enabled: boolean;
  limitsByField?: Record<string, Record<string, TripSnapshotSlot>>;
}

function keyForRow(
  fieldId: string,
  repeatIndex: number | null | undefined
): string {
  if (repeatIndex === undefined || repeatIndex === null) return fieldId;
  return `${fieldId}_${repeatIndex}`;
}

function selectedCountBeforeIndex(
  values: Record<string, unknown>,
  cap: EnrollmentCapacity,
  sede: string,
  weekId: string,
  expectedYes: string,
  repeatIndex: number
): number {
  let n = 0;
  for (let i = 0; i < repeatIndex; i++) {
    const sedeI = String(values[keyForRow(cap.sedeFieldId, i)] ?? '').trim();
    if (sedeI !== sede) continue;
    const v = values[keyForRow(weekId, i)];
    const on = typeof v === 'string' && v.trim().toLowerCase() === expectedYes;
    if (on) n += 1;
  }
  return n;
}

function selectedTripOptionCountBeforeIndex(
  values: Record<string, unknown>,
  fieldId: string,
  optionValue: string,
  repeatIndex: number
): number {
  let n = 0;
  for (let i = 0; i < repeatIndex; i++) {
    const key = keyForRow(fieldId, i);
    const raw = values[key];
    const selected = Array.isArray(raw)
      ? raw.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
      : typeof raw === 'string' && raw.trim()
        ? [raw.trim()]
        : [];
    if (selected.includes(optionValue)) n += 1;
  }
  return n;
}

function isWeekSelected(value: unknown, expectedYes: string): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;
  const norm = value.trim().toLowerCase();
  const yes = expectedYes.trim().toLowerCase();
  if (norm === yes) return true;
  // tolleranza comune per configurazioni "si/sì/yes/true/1"
  if (yes === 'si' || yes === 'sì') {
    return norm === 'si' || norm === 'sì' || norm === 'yes' || norm === 'true' || norm === '1';
  }
  return false;
}

/**
 * Messaggio se per la sede/settimane selezionate i posti confermati sono esauriti
 * (lista d’attesa al submit).
 */
export function capacityWaitlistHint(
  module: Module,
  snapshot: EnrollmentSnapshot | null,
  values: Record<string, unknown>,
  repeatIndex: number | null | undefined
): string | null {
  const cap = module.enrollmentCapacity;
  if (!cap?.enabled || !snapshot?.enabled || !snapshot.slots) return null;
  const yes = (cap.weekParticipationValue ?? 'si').trim().toLowerCase();
  const sede = String(values[keyForRow(cap.sedeFieldId, repeatIndex)] ?? '').trim();
  if (!sede) return null;
  const fullWeeks: string[] = [];
  for (const wid of cap.weekFieldIds) {
    const val = values[keyForRow(wid, repeatIndex)];
    const on = isWeekSelected(val, yes);
    if (!on) continue;
    const slot = snapshot.slots[sede]?.[wid];
    if (!slot) continue;
    // Considera anche i fratelli già selezionati nello stesso submit corrente.
    const localBefore =
      repeatIndex !== undefined && repeatIndex !== null
        ? selectedCountBeforeIndex(values, cap, sede, wid, yes, repeatIndex)
        : 0;
    const effectiveRemaining = slot.remaining - localBefore;
    if (effectiveRemaining <= 0) {
      fullWeeks.push(wid);
    }
  }
  if (fullWeeks.length === 0) return null;
  return (
    'Per la sede selezionata il numero massimo di posti confermati per una o più settimane è stato raggiunto. ' +
    'Queste settimane non verranno conteggiate nel totale da pagare e, al submit, l’iscrizione sarà inserita in lista di attesa. ' +
    'Sarai contattato dalla segreteria Grest appena si libera un posto.'
  );
}

export function tripCapacityWaitlistHint(
  module: Module,
  snapshot: TripCapacitySnapshot | null,
  values: Record<string, unknown>,
  repeatIndex: number | null | undefined
): string | null {
  const cfg = module.tripCapacity;
  if (!cfg?.enabled || !snapshot?.enabled || !snapshot.limitsByField) return null;
  const fullLabels: string[] = [];
  for (const [fieldId, optionMap] of Object.entries(cfg.limitsByField ?? {})) {
    const raw = values[keyForRow(fieldId, repeatIndex)];
    const selected = Array.isArray(raw)
      ? raw.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
      : typeof raw === 'string' && raw.trim()
        ? [raw.trim()]
        : [];
    if (selected.length === 0) continue;
    const fieldDef = module.steps.flatMap((s) => s.fields).find((f) => f.id === fieldId);
    for (const optionValue of selected) {
      if (!(optionValue in optionMap)) continue;
      const slot = snapshot.limitsByField[fieldId]?.[optionValue];
      if (!slot) continue;
      const localBefore =
        repeatIndex !== undefined && repeatIndex !== null
          ? selectedTripOptionCountBeforeIndex(values, fieldId, optionValue, repeatIndex)
          : 0;
      if (slot.remaining - localBefore <= 0) {
        const label =
          fieldDef?.options?.find((o) => o.value === optionValue)?.label?.it || optionValue;
        fullLabels.push(label);
      }
    }
  }
  if (fullLabels.length === 0) return null;
  return (
    "Alcune gite selezionate hanno raggiunto la capienza massima. Verranno messe in lista d'attesa al submit: " +
    Array.from(new Set(fullLabels)).join(', ') +
    '.'
  );
}
