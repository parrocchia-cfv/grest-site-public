import type { ThankYou } from '@/types/module';
import { getLabel } from '@/lib/i18n';
import { Alert, Container, Typography } from '@mui/material';
import { FormCard } from './FormCard';

const LOCALE = 'it';

const EMAIL_NOTICE = {
  it: 'Se hai indicato un indirizzo email valido, potresti ricevere una copia o una notifica via email.',
} as const;

/** Se `emailOnSubmit.body` contiene `{{ riepilogo }}` (riepilogo generato dal backend). */
const EMAIL_RIEPILOGO_HINT = {
  it: 'Nella mail di conferma troverai anche il riepilogo economico delle voci indicate (generato dal sistema).',
} as const;

interface ThankYouViewProps {
  thankYou: ThankYou;
  /** Se true (da schema modulo `emailOnSubmit.enabled`), messaggio neutro senza promettere il contenuto dell’email. */
  emailOnSubmitEnabled?: boolean;
  /** Opzionale: body email contiene `{{ riepilogo }}` → messaggio più esplicito sul riepilogo in mail. */
  showRiepilogoInEmailHint?: boolean;
}

export function ThankYouView({
  thankYou,
  emailOnSubmitEnabled,
  showRiepilogoInEmailHint,
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
            {showRiepilogoInEmailHint && (
              <Typography component="span" variant="body2" sx={{ display: 'block', mt: 1.25 }}>
                {getLabel(EMAIL_RIEPILOGO_HINT, LOCALE)}
              </Typography>
            )}
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
