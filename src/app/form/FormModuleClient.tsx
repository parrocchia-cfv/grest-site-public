'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Module } from '@/types/module';
import { getModule } from '@/lib/api-client';
import { ModuleNotFoundError } from '@/lib/api-client';
import { ModuleNotFound } from '@/components/ModuleNotFound';
import { MultiStepForm } from '@/components/MultiStepForm';
import { CircularProgress, Container, Typography } from '@mui/material';
import { FormCard } from '@/components/FormCard';

export function FormModuleClient() {
  const searchParams = useSearchParams();
  const guid = searchParams.get('guid')?.trim() ?? '';
  const [module, setModule] = useState<Module | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!guid) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    getModule(guid)
      .then((m) => {
        if (!cancelled) {
          setModule(m);
          setNotFound(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          if (e instanceof ModuleNotFoundError) setNotFound(true);
          else setError(e instanceof Error ? e.message : 'Errore di caricamento');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [guid]);

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
            Caricamento modulo…
          </Typography>
        </FormCard>
      </Container>
    );
  }

  if (notFound) return <ModuleNotFound />;

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

  if (!module) return null;

  return (
    <Container maxWidth="sm">
      <MultiStepForm module={module} />
    </Container>
  );
}
