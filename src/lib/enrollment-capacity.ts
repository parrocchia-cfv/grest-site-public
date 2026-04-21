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
    const on =
      typeof val === 'string' && val.trim().toLowerCase() === yes;
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
