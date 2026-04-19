/**
 * Email del destinatario notifiche (`emailOnSubmit.toFieldId`), dal payload wire.
 * Supporta chiave base o suffissi repeat (`fieldId_0`, …).
 */
export function getSubmittedEmailFromResponses(
  responses: Record<string, unknown>,
  toFieldId?: string
): string | null {
  if (!toFieldId?.trim()) return null;
  const id = toFieldId.trim();
  const direct = responses[id];
  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${esc}_(\\d+)$`);
  const candidates: { idx: number; email: string }[] = [];
  for (const [key, val] of Object.entries(responses)) {
    const m = re.exec(key);
    if (m && typeof val === 'string' && val.trim()) {
      candidates.push({ idx: Number(m[1]), email: val.trim() });
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.idx - b.idx);
  return candidates[0].email;
}
