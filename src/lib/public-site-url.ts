/**
 * Base URL del sito pubblico (deploy statico / dominio iscrizioni).
 * Allineato alla convenzione in `apps/admin/src/lib/public-form-url.ts`.
 */
export function getPublicSiteBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_PUBLIC_SITE_URL?.trim() ?? '';
  if (!raw) return null;
  return raw.replace(/\/+$/, '');
}

/**
 * URL per modificare una compilazione: `/modifica?group=<uuid>`.
 * Preferisci `submissionGroupId` dalla risposta POST/PATCH; altrimenti `submissionId`
 * (invii salvati prima che il backend valorizzasse sempre il gruppo).
 */
export function buildPublicEditSubmissionUrl(editToken: string): string | null {
  const base = getPublicSiteBaseUrl();
  const id = editToken?.trim();
  if (!base || !id) return null;
  const root = base.endsWith('/') ? base : `${base}/`;
  return new URL(`modifica?group=${encodeURIComponent(id)}`, root).href;
}
