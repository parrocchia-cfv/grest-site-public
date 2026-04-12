'use client';

import { Paper, type PaperProps } from '@mui/material';

/**
 * Contenitore tipo “scheda” da form online: bordo leggero e ombra soft.
 */
export function FormCard({ children, sx, ...rest }: PaperProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow:
          '0 1px 2px rgba(60, 64, 67, 0.07), 0 2px 8px rgba(60, 64, 67, 0.06)',
        overflow: 'hidden',
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Paper>
  );
}
