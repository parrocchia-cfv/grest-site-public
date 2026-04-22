import type { ThankYou } from '@/types/module';
import { getLabel, multilineI18nSx } from '@/lib/i18n';
import { Alert, Container, Typography } from '@mui/material';
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
  /** Lista d’attesa (posti esauriti per sede/settimana), da risposta submit. */
  capacityWaitlisted?: boolean;
}

export function ThankYouView({
  thankYou,
  emailOnSubmitEnabled,
  notifierEmail,
  showRiepilogoInEmailHint,
  isUpdateAfterEdit,
  capacityWaitlisted,
}: ThankYouViewProps) {
  const title = getLabel(thankYou.title, LOCALE);
  const body = getLabel(thankYou.body, LOCALE);
  const notes = getLabel(thankYou.notes, LOCALE);

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
        {capacityWaitlisted && (
          <Alert severity="warning" sx={{ mb: 2, ...multilineI18nSx }}>
            Uno o più iscritti risultano in lista d’attesa perché i posti confermati per sede/settimane
            o per alcune gite selezionate erano esauriti. La richiesta è comunque registrata; l’ordine
            interno è gestito dagli organizzatori.
          </Alert>
        )}
        {isUpdateAfterEdit && (
          <Alert severity="success" sx={{ mb: 2, ...multilineI18nSx }}>
            {editSavedNoticeIt(notifierEmail ?? null)}
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
