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
    if (slot && slot.remaining <= 0) {
      fullWeeks.push(wid);
    }
  }
  if (fullWeeks.length === 0) return null;
  return (
    'Per la sede e le settimane selezionate i posti confermati potrebbero essere esauriti. ' +
    'Puoi comunque inviare la richiesta: verrai messo in lista d’attesa; l’ordine interno è gestito dagli organizzatori.'
  );
}
