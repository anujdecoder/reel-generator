import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import './index.css'
import App from './App.tsx'

// Create a dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#667eea',
      light: '#9fa8da',
      dark: '#5c6bc0',
    },
    secondary: {
      main: '#764ba2',
    },
    success: {
      main: '#48bb78',
    },
    error: {
      main: '#e53e3e',
    },
    warning: {
      main: '#ecc94b',
    },
    background: {
      default: '#0f1419',
      paper: '#1a202c',
    },
  },
  typography: {
    fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
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
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
