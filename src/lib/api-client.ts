import type { Module } from '@/types/module';
import { getApiBaseUrl } from './api-config';

export interface SubmitPayload {
  moduleId: string;
  submittedAt: string;
  responses: Record<string, unknown>;
}

export interface SubmitResponse {
  ok: boolean;
  submissionId?: string;
}

export class ModuleNotFoundError extends Error {
  constructor(guid: string) {
    super(`Module not found: ${guid}`);
    this.name = 'ModuleNotFoundError';
  }
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

  if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
  return res.json() as Promise<SubmitResponse>;
}

/**
 * Get module schema by GUID from backend.
 */
export async function getModule(guid: string): Promise<Module> {
  return fetchModule(guid);
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
