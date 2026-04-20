import type { Module } from '@/types/module';
import type { EnrollmentSnapshot } from '@/lib/enrollment-capacity';
import { getApiBaseUrl } from './api-config';

export interface SubmitPayload {
  moduleId: string;
  submittedAt: string;
  responses: Record<string, unknown>;
}

export interface SubmitResponse {
  ok: boolean;
  submissionId?: string;
  submissionIds?: string[];
  submissionGroupId?: string | null;
  /** True se almeno una riga è in lista d’attesa (posti esauriti per sede/settimana). */
  capacityWaitlisted?: boolean;
}

/** Risposta GET pubblica per modificare un invio (stesso shape modulo di GET /api/modules/{guid}). */
export interface PublicSubmissionLoad {
  module: Module;
  responses: Record<string, unknown>;
  submittedAt: string | null;
  submissionGroupId?: string | null;
}

export class ModuleNotFoundError extends Error {
  constructor(guid: string) {
    super(`Module not found: ${guid}`);
    this.name = 'ModuleNotFoundError';
  }
}

export class SubmissionNotFoundError extends Error {
  constructor(submissionId: string) {
    super(`Submission not found: ${submissionId}`);
    this.name = 'SubmissionNotFoundError';
  }
}

async function errorMessageFromResponse(
  res: Response,
  fallback: string
): Promise<string> {
  try {
    const data = (await res.json()) as {
      detail?: unknown;
      message?: unknown;
      error?: unknown;
    };
    if (typeof data.detail === 'string' && data.detail.trim()) return data.detail.trim();
    if (data.detail && typeof data.detail === 'object') {
      const d = data.detail as { message?: unknown; error?: unknown };
      const msg =
        typeof d.message === 'string' && d.message.trim() ? d.message.trim() : null;
      const code =
        typeof d.error === 'string' && d.error.trim() ? d.error.trim() : null;
      if (msg && code) return `[${code}] ${msg}`;
      if (msg) return msg;
    }
    if (typeof data.message === 'string' && data.message.trim()) return data.message.trim();
    if (typeof data.error === 'string' && data.error.trim()) return data.error.trim();
  } catch {
    // no-op: fallback below
  }
  return `${fallback} (HTTP ${res.status})`;
}

async function fetchModule(guid: string): Promise<Module> {
  const base = getApiBaseUrl();

  const res = await fetch(`${base}/api/modules/${encodeURIComponent(guid)}`);
  if (res.status === 404) throw new ModuleNotFoundError(guid);
  if (!res.ok) throw new Error(`Failed to load module: ${res.status}`);

  const data = await res.json();
  return data as Module;
}

async function fetchSubmit(
  moduleId: string,
  payload: SubmitPayload
): Promise<SubmitResponse> {
  const base = getApiBaseUrl();

  const res = await fetch(`${base}/api/forms/${encodeURIComponent(moduleId)}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      await errorMessageFromResponse(
        res,
        `Invio non riuscito (errore ${res.status}). Riprova tra poco.`
      )
    );
  }
  return res.json() as Promise<SubmitResponse>;
}

/**
 * Get module schema by GUID from backend.
 */
export async function getModule(guid: string): Promise<Module> {
  return fetchModule(guid);
}

/**
 * Snapshot posti disponibili per sede/settimana (moduli con `enrollmentCapacity` attivo).
 */
export async function getEnrollmentSnapshot(guid: string): Promise<EnrollmentSnapshot> {
  const base = getApiBaseUrl();
  const res = await fetch(
    `${base}/api/modules/${encodeURIComponent(guid)}/enrollment-snapshot`
  );
  if (res.status === 404) throw new ModuleNotFoundError(guid);
  if (!res.ok) throw new Error(`Failed to load enrollment snapshot: ${res.status}`);
  return res.json() as Promise<EnrollmentSnapshot>;
}

/**
 * Submit form to backend.
 */
export async function submitForm(
  moduleId: string,
  payload: SubmitPayload
): Promise<SubmitResponse> {
  return fetchSubmit(moduleId, payload);
}

/**
 * Carica modulo + risposte salvate per consentire la modifica (endpoint pubblico da implementare sul backend).
 * @see contratti in chat / docs (GET /api/public/submissions/{submissionId})
 */
export async function getPublicSubmission(
  submissionId: string
): Promise<PublicSubmissionLoad> {
  const base = getApiBaseUrl();
  const res = await fetch(
    `${base}/api/public/submissions/${encodeURIComponent(submissionId)}`
  );
  if (res.status === 404) throw new SubmissionNotFoundError(submissionId);
  if (!res.ok) throw new Error(`Failed to load submission: ${res.status}`);
  return res.json() as Promise<PublicSubmissionLoad>;
}

/**
 * Aggiorna un invio esistente (stesso body del submit; nessun campo extra obbligatorio lato client).
 * Il backend aggiorna `submitted_at`, persiste `responses` e può reinviare email di aggiornamento.
 */
export async function updatePublicSubmission(
  submissionId: string,
  payload: SubmitPayload
): Promise<SubmitResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(
    `${base}/api/public/submissions/${encodeURIComponent(submissionId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  if (res.status === 404) throw new SubmissionNotFoundError(submissionId);
  if (!res.ok) {
    throw new Error(
      await errorMessageFromResponse(
        res,
        `Aggiornamento non riuscito (errore ${res.status}). Riprova tra poco.`
      )
    );
  }
  return res.json() as Promise<SubmitResponse>;
}
