import type { ThankYou } from '@/types/module';
import { getLabel } from '@/lib/i18n';
import { Alert, Container, Typography } from '@mui/material';
import { FormCard } from './FormCard';

const LOCALE = 'it';

const EMAIL_NOTICE = {
  it: 'Se hai indicato un indirizzo email valido, potresti ricevere una copia o una notifica via email.',
} as const;

interface ThankYouViewProps {
  thankYou: ThankYou;
  /** Se true (da schema modulo `emailOnSubmit.enabled`), messaggio neutro senza promettere il contenuto dell’email. */
  emailOnSubmitEnabled?: boolean;
}

export function ThankYouView({
  thankYou,
  emailOnSubmitEnabled,
}: ThankYouViewProps) {
  const title = getLabel(thankYou.title, LOCALE);
  const body = getLabel(thankYou.body, LOCALE);
  const notes = getLabel(thankYou.notes, LOCALE);

  return (
    <Container maxWidth="sm">
      <FormCard sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        <Typography variant="h5" component="h1" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body1" paragraph sx={{ color: 'text.primary' }}>
          {body}
        </Typography>
        {emailOnSubmitEnabled && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {getLabel(EMAIL_NOTICE, LOCALE)}
          </Alert>
        )}
        {notes && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {notes}
          </Typography>
        )}
      </FormCard>
    </Container>
  );
}
