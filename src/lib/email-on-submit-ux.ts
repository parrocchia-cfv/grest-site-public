/**
 * UX lato public: nessun calcolo prezzi; solo rilevamento placeholder nel body email (schema GET).
 * Il testo `{{ riepilogo }}` è sostituito dal backend dopo il submit.
 */
const RIEPILOGO_PLACEHOLDER = /\{\{\s*riepilogo\s*\}\}/i;

export function emailBodyIncludesRiepilogoPlaceholder(body: string | undefined): boolean {
  if (!body || typeof body !== 'string') return false;
  return RIEPILOGO_PLACEHOLDER.test(body);
}
