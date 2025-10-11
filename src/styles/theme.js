// src/styles/theme.js
import { createTheme } from '@mui/material/styles';

// Palette de couleurs inspirée des maquettes professionnelles
const palette = {
  primary: {
    main: '#1976d2', // Un bleu professionnel et accessible
    light: '#42a5f5',
    dark: '#1565c0',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#9c27b0', // Un violet pour les accents secondaires
    light: '#ba68c8',
    dark: '#7b1fa2',
    contrastText: '#ffffff',
  },
  background: {
    default: '#f4f6f8', // Fond général très clair, presque blanc
    paper: '#ffffff',   // Fond pour les cartes, sidebar, etc.
  },
  text: {
    primary: '#212b36',   // Texte principal, presque noir
    secondary: '#637381', // Texte secondaire, gris moyen
    disabled: '#919eab',  // Texte désactivé
  },
  error: {
    main: '#d32f2f',
  },
  warning: {
    main: '#ed6c02',
  },
  info: {
    main: '#0288d1',
  },
  success: {
    main: '#2e7d32',
  },
  grey: {
    100: '#f9fafb',
    200: '#f4f6f8',
    300: '#dfe3e8',
    400: '#c4cdd5',
    500: '#919eab',
    600: '#637381',
    700: '#454f5b',
    800: '#212b36',
    900: '#161c24',
  },
};

// Création du thème MUI
const theme = createTheme({
  palette: {
    ...palette,
    mode: 'light',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, fontSize: '2.5rem' },
    h2: { fontWeight: 700, fontSize: '2rem' },
    h3: { fontWeight: 600, fontSize: '1.75rem' },
    h4: { fontWeight: 600, fontSize: '1.5rem' },
    h5: { fontWeight: 600, fontSize: '1.25rem' },
    h6: { fontWeight: 600, fontSize: '1.1rem' },
    subtitle1: { color: palette.text.secondary, fontWeight: 500 },
    body1: { fontSize: '1rem' },
    body2: { fontSize: '0.875rem', color: palette.text.secondary },
  },
  shape: {
    borderRadius: 8, // Bordures arrondies pour un look moderne
  },
  components: {
    // Personnalisation des composants MUI pour un look unifié
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Pas de majuscules sur les boutons
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2)',
          }
        },
        containedPrimary: {
          boxShadow: `0 8px 16px 0 rgba(25, 118, 210, 0.24)`, // Ombre subtile pour le bouton primaire
        }
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 4px 20px rgba(145, 158, 171, 0.1)', // Ombre très légère pour les cartes
          border: `1px solid ${palette.grey[200]}`,
          borderRadius: 12,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          boxShadow: 'none',
          borderBottom: `1px solid ${palette.grey[200]}`,
          color: palette.text.primary,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${palette.grey[200]}`,
          backgroundColor: palette.background.paper,
        },
      },
    },
    MuiOutlinedInput: {
        styleOverrides: {
            root: {
                '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: palette.primary.light,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: palette.primary.main,
                    borderWidth: '1px',
                },
            },
            notchedOutline: {
                borderColor: palette.grey[300],
            }
        }
    },
    MuiPaper: {
      styleOverrides: {
        elevation1: {
          boxShadow: '0px 4px 20px rgba(145, 158, 171, 0.1)',
        }
      }
    }
  },
});

export default theme;