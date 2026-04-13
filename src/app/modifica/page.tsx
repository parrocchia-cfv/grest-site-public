import { Suspense } from 'react';
import { CircularProgress, Container, Typography } from '@mui/material';
import { FormCard } from '@/components/FormCard';
import { EditSubmissionClient } from './EditSubmissionClient';

function ModificaFallback() {
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
          Caricamento…
        </Typography>
      </FormCard>
    </Container>
  );
}

/** Modifica compilazione: `/modifica?submission=<uuid>` (UUID riga `submissions.id`). */
export default function ModificaPage() {
  return (
    <Suspense fallback={<ModificaFallback />}>
      <EditSubmissionClient />
    </Suspense>
  );
}
