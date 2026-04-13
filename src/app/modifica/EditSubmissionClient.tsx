'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Module } from '@/types/module';
import {
  getPublicSubmission,
  SubmissionNotFoundError,
} from '@/lib/api-client';
import { MultiStepForm } from '@/components/MultiStepForm';
import { CircularProgress, Container, Typography } from '@mui/material';
import { FormCard } from '@/components/FormCard';

export function EditSubmissionClient() {
  const searchParams = useSearchParams();
  const submissionId = searchParams.get('submission')?.trim() ?? '';
  const [module, setModule] = useState<Module | null>(null);
  const [responses, setResponses] = useState<Record<string, unknown> | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!submissionId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    getPublicSubmission(submissionId)
      .then((data) => {
        if (!cancelled) {
          setModule(data.module);
          setResponses(data.responses ?? {});
          setNotFound(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          if (e instanceof SubmissionNotFoundError) setNotFound(true);
          else setError(e instanceof Error ? e.message : 'Errore di caricamento');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  if (loading) {
    return (
      <Container maxWidth="sm">
        <FormCard
          sx={{
            py: 5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <CircularProgress size={36} thickness={4} />
          <Typography variant="body2" color="text.secondary">
            Caricamento risposte…
          </Typography>
        </FormCard>
      </Container>
    );
  }

  if (notFound || !submissionId) {
    return (
      <Container maxWidth="sm">
        <FormCard sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
          <Typography variant="subtitle1" color="text.secondary" sx={{ lineHeight: 1.65 }}>
            Link non valido o scaduto. Verifica il link ricevuto per modificare la compilazione.
          </Typography>
        </FormCard>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm">
        <FormCard sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
          <Typography variant="body1" color="error">
            {error}
          </Typography>
        </FormCard>
      </Container>
    );
  }

  if (!module || responses === null) return null;

  return (
    <Container maxWidth="sm">
      <MultiStepForm
        module={module}
        submissionId={submissionId}
        initialResponses={responses}
      />
    </Container>
  );
}
