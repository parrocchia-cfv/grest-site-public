'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';

/**
 * Export statico: niente `redirect()` lato server (su GitHub Pages non diventa HTTP 302).
 * Redirect client → `/in-arrivo`.
 */
export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/in-arrivo');
  }, [router]);
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
      <CircularProgress />
    </Box>
  );
}
