import { Suspense } from 'react';
import { CircularProgress, Container, Typography } from '@mui/material';
import { FormCard } from '@/components/FormCard';
import { FormModuleClient } from './FormModuleClient';

function FormFallback() {
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

export default function FormPage() {
  return (
    <Suspense fallback={<FormFallback />}>
      <FormModuleClient />
    </Suspense>
  );
}
