'use client';

import { createTheme } from '@mui/material/styles';

/**
 * Tema light sobrio, ispirato ai form tipo Google Forms:
 * poco contrasto aggressivo, ombre leggere, angoli morbidi.
 */
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a73e8',
      dark: '#1557b0',
      light: '#e8f0fe',
    },
    secondary: {
      main: '#5f6368',
    },
    text: {
      primary: '#202124',
      secondary: '#5f6368',
    },
    background: {
      default: '#f0f2f5',
      paper: '#ffffff',
    },
    divider: 'rgba(60, 64, 67, 0.12)',
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h5: {
      fontWeight: 500,
      letterSpacing: '-0.01em',
      lineHeight: 1.35,
    },
    h6: {
      fontWeight: 500,
      letterSpacing: '-0.008em',
    },
    body1: {
      lineHeight: 1.6,
    },
    body2: {
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
      letterSpacing: '0.01em',
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          '&:hover': {
            boxShadow: '0 1px 2px rgba(26,115,232,0.35)',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#fafafa',
          transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
          '&:hover': {
            backgroundColor: '#fff',
          },
          '&.Mui-focused': {
            backgroundColor: '#fff',
            boxShadow: '0 0 0 3px rgba(26, 115, 232, 0.12)',
          },
        },
        notchedOutline: {
          borderColor: 'rgba(60, 64, 67, 0.2)',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          '&.Mui-focused': {
            color: '#1a73e8',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 8,
          borderRadius: 999,
          overflow: 'hidden',
          backgroundColor: 'rgba(60, 64, 67, 0.08)',
        },
        bar: {
          borderRadius: 999,
        },
      },
    },
    MuiStepper: {
      styleOverrides: {
        root: {
          padding: '12px 8px',
          borderRadius: 8,
          backgroundColor: 'rgba(60, 64, 67, 0.04)',
          border: '1px solid',
          borderColor: 'rgba(60, 64, 67, 0.08)',
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          '&.Mui-active': {
            fontWeight: 600,
          },
          '&.Mui-completed': {
            fontWeight: 500,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        standardInfo: {
          backgroundColor: '#e8f0fe',
          color: '#174ea6',
        },
      },
    },
  },
});
