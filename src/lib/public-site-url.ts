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
 * URL per modificare una compilazione: `/modifica?submission=<uuid>`.
 * `submissionId` = `submissions.id` (prima riga / primario da POST submit).
 */
export function buildPublicEditSubmissionUrl(submissionId: string): string | null {
  const base = getPublicSiteBaseUrl();
  const id = submissionId?.trim();
  if (!base || !id) return null;
  const root = base.endsWith('/') ? base : `${base}/`;
  return new URL(`modifica?submission=${encodeURIComponent(id)}`, root).href;
}
