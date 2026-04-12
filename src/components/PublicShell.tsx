'use client';

import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';

/**
 * Sfondo pagina leggermente stratificato (non piatto) senza risultare “marketing”.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        py: { xs: 2, sm: 4 },
        px: { xs: 1.5, sm: 2 },
        backgroundColor: 'background.default',
        backgroundImage: (theme) =>
          `radial-gradient(ellipse 100% 60% at 50% -15%, ${alpha(theme.palette.primary.main, 0.09)}, transparent 55%)`,
      }}
    >
      {children}
    </Box>
  );
}
