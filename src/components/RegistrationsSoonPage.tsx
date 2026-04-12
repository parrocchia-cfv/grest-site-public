import { Container, Typography } from '@mui/material';
import { FormCard } from './FormCard';

/**
 * Messaggio temporaneo: iscrizioni in arrivo (stessa UI per /in-arrivo, 404 e modulo non trovato).
 */
export function RegistrationsSoonPage() {
  return (
    <Container maxWidth="sm">
      <FormCard sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
        <Typography
          variant="h5"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 600, color: 'text.primary' }}
        >
          Iscrizioni in arrivo
        </Typography>
        <Typography
          variant="subtitle1"
          component="p"
          color="text.secondary"
          sx={{ lineHeight: 1.65 }}
        >
          A momenti saranno disponibili le iscrizioni online. Ci scusiamo per il disagio: ti
          invitiamo a riprovare nella serata di oggi.
        </Typography>
      </FormCard>
    </Container>
  );
}
