'use client';

import { useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';

/**
 * GitHub Pages: URL sconosciuti finiscono qui. Se era `/form/<guid>` (vecchio formato),
 * reindirizza a `/form?guid=…`. Altrimenti → `/in-arrivo`.
 */
export default function NotFound() {
  useEffect(() => {
    const { pathname, origin } = window.location;
    const normalized = pathname.replace(/\/$/, '') || '/';
    const m = normalized.match(/^\/form\/([^/]+)$/);
    if (m) {
      window.location.replace(`${origin}/form?guid=${encodeURIComponent(m[1])}`);
      return;
    }
    window.location.replace(`${origin}/in-arrivo`);
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '40vh',
      }}
    >
      <CircularProgress />
    </Box>
  );
}
