import { useState, useCallback } from 'react';
import type { ThankYou } from '@/types/module';
import { getLabel, multilineI18nSx } from '@/lib/i18n';
import { Alert, Box, Button, Container, Link, Typography } from '@mui/material';
import { FormCard } from './FormCard';

const LOCALE = 'it';

/** Se `emailOnSubmit.body` contiene `{{ riepilogo }}` (riepilogo generato dal backend). */
const EMAIL_RIEPILOGO_HINT = {
  it: 'Nella mail troverai anche il riepilogo economico delle voci indicate.',
} as const;

function emailCopyNoticeIt(email: string | null): string {
  if (email) {
    return `Riceverai una copia dell’iscrizione all’indirizzo ${email}.`;
  }
  return 'Riceverai una copia dell’iscrizione all’indirizzo email che hai indicato nel modulo.';
}

function editSavedNoticeIt(email: string | null): string {
  if (email) {
    return `Le modifiche sono state salvate. Riceverai l’aggiornamento all’indirizzo ${email}.`;
  }
  return 'Le modifiche sono state salvate. Riceverai l’aggiornamento all’indirizzo email che hai indicato nel modulo.';
}

const EDIT_LINK_HELPER = {
  it: 'Conserva questo link in un posto sicuro: serve solo a chi ha compilato il modulo per modificare le risposte in seguito.',
} as const;

interface ThankYouViewProps {
  thankYou: ThankYou;
  /** Se true (da schema modulo `emailOnSubmit.enabled`), messaggio sulla copia email. */
  emailOnSubmitEnabled?: boolean;
  /** Email destinatario notifiche (da `emailOnSubmit.toFieldId` nei responses inviati). */
  notifierEmail?: string | null;
  /** Opzionale: body email contiene `{{ riepilogo }}` → messaggio più esplicito sul riepilogo in mail. */
  showRiepilogoInEmailHint?: boolean;
  /** Dopo salvataggio da flusso “modifica risposta” (PATCH submission). */
  isUpdateAfterEdit?: boolean;
  /** URL pubblico `/modifica?group=…` se `NEXT_PUBLIC_PUBLIC_SITE_URL` è configurato. */
  editSubmissionUrl?: string | null;
}

export function ThankYouView({
  thankYou,
  emailOnSubmitEnabled,
  notifierEmail,
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
        <Typography variant="h5" component="h1" gutterBottom sx={multilineI18nSx}>
          {title}
        </Typography>
        <Typography
          variant="body1"
          paragraph
          sx={{ color: 'text.primary', ...multilineI18nSx }}
        >
          {body}
        </Typography>
        {isUpdateAfterEdit && (
          <Alert severity="success" sx={{ mb: 2, ...multilineI18nSx }}>
            {editSavedNoticeIt(notifierEmail ?? null)}
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
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ mt: 1.25, ...multilineI18nSx }}
            >
              {getLabel(EDIT_LINK_HELPER, LOCALE)}
            </Typography>
          </Alert>
        )}
        {emailOnSubmitEnabled && (
          <Alert severity="info" sx={{ mb: 2, ...multilineI18nSx }}>
            {emailCopyNoticeIt(notifierEmail ?? null)}
            {showRiepilogoInEmailHint && (
              <Typography
                component="span"
                variant="body2"
                sx={{ display: 'block', mt: 1.25, ...multilineI18nSx }}
              >
                {getLabel(EMAIL_RIEPILOGO_HINT, LOCALE)}
              </Typography>
            )}
          </Alert>
        )}
        {notes && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ...multilineI18nSx }}>
            {notes}
          </Typography>
        )}
      </FormCard>
    </Container>
  );
}
