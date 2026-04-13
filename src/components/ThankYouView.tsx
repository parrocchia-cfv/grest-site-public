import { useState, useCallback } from 'react';
import type { ThankYou } from '@/types/module';
import { getLabel } from '@/lib/i18n';
import { Alert, Box, Button, Container, Link, Typography } from '@mui/material';
import { FormCard } from './FormCard';

const LOCALE = 'it';

const EMAIL_NOTICE = {
  it: 'Se hai indicato un indirizzo email valido, potresti ricevere una copia o una notifica via email.',
} as const;

/** Se `emailOnSubmit.body` contiene `{{ riepilogo }}` (riepilogo generato dal backend). */
const EMAIL_RIEPILOGO_HINT = {
  it: 'Nella mail di conferma troverai anche il riepilogo economico delle voci indicate (generato dal sistema).',
} as const;

const EDIT_SAVED_NOTICE = {
  it: 'Le modifiche sono state salvate. Se il modulo prevede notifiche email, potresti ricevere un messaggio con l’aggiornamento.',
} as const;

const EDIT_LINK_HELPER = {
  it: 'Conserva questo link in un posto sicuro: serve solo a chi ha compilato il modulo per modificare le risposte in seguito.',
} as const;

interface ThankYouViewProps {
  thankYou: ThankYou;
  /** Se true (da schema modulo `emailOnSubmit.enabled`), messaggio neutro senza promettere il contenuto dell’email. */
  emailOnSubmitEnabled?: boolean;
  /** Opzionale: body email contiene `{{ riepilogo }}` → messaggio più esplicito sul riepilogo in mail. */
  showRiepilogoInEmailHint?: boolean;
  /** Dopo salvataggio da flusso “modifica risposta” (PATCH submission). */
  isUpdateAfterEdit?: boolean;
  /** URL pubblico `/modifica?submission=…` se `NEXT_PUBLIC_PUBLIC_SITE_URL` è configurato. */
  editSubmissionUrl?: string | null;
}

export function ThankYouView({
  thankYou,
  emailOnSubmitEnabled,
  showRiepilogoInEmailHint,
  isUpdateAfterEdit,
  editSubmissionUrl,
}: ThankYouViewProps) {
  const title = getLabel(thankYou.title, LOCALE);
  const body = getLabel(thankYou.body, LOCALE);
  const notes = getLabel(thankYou.notes, LOCALE);
  const [copyDone, setCopyDone] = useState(false);

  const handleCopyEditLink = useCallback(async () => {
    if (!editSubmissionUrl) return;
    try {
      await navigator.clipboard.writeText(editSubmissionUrl);
      setCopyDone(true);
      window.setTimeout(() => setCopyDone(false), 2500);
    } catch {
      setCopyDone(false);
    }
  }, [editSubmissionUrl]);

  return (
    <Container maxWidth="sm">
      <FormCard sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        <Typography variant="h5" component="h1" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body1" paragraph sx={{ color: 'text.primary' }}>
          {body}
        </Typography>
        {isUpdateAfterEdit && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {getLabel(EDIT_SAVED_NOTICE, LOCALE)}
          </Alert>
        )}
        {editSubmissionUrl && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <Link href={editSubmissionUrl} underline="always">
                Modifica risposta
              </Link>
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Button size="small" variant="outlined" onClick={() => void handleCopyEditLink()}>
                Copia link
              </Button>
              {copyDone && (
                <Typography variant="caption" color="success.dark">
                  Link copiato negli appunti.
                </Typography>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.25 }}>
              {getLabel(EDIT_LINK_HELPER, LOCALE)}
            </Typography>
          </Alert>
        )}
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
