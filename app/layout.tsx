import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import type { Metadata } from 'next'
import {
  ColorSchemeScript,
  MantineProvider,
  createTheme,
  mantineHtmlProps,
} from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'ShiftSync — Coastal Eats', template: '%s | ShiftSync' },
  description: 'Intelligent shift scheduling for Coastal Eats restaurant group',
}

const theme = createTheme({
  primaryColor: 'indigo',
  fontFamily: 'Inter, system-ui, sans-serif',
  headings: { fontFamily: 'Inter, system-ui, sans-serif' },
  colors: {
    dark: [
      '#f1f5f9', // 0 - text primary
      '#94a3b8', // 1 - text secondary
      '#64748b', // 2 - text muted
      '#2a2a3e', // 3 - surface-4
      '#222232', // 4 - surface-3
      '#1a1a24', // 5 - surface-2
      '#111118', // 6 - surface-1 (card background)
      '#0d0d14', // 7
      '#0a0a0f', // 8 - surface-0 (page background)
      '#080810', // 9
    ],
  },
  components: {
    Card: {
      defaultProps: { withBorder: true },
      styles: { root: { borderColor: 'var(--border-light)' } },
    },
    NavLink: {
      styles: {
        root: {
          borderRadius: '10px',
          '&[dataActive]': {
            background: 'rgba(99,102,241,0.12)',
            color: '#818cf8',
            border: '1px solid rgba(99,102,241,0.2)',
          },
        },
      },
    },
    AppShell: {
      styles: {
        navbar: { borderColor: 'var(--border-light)' },
      },
    },
    Modal: {
      defaultProps: { centered: true, overlayProps: { blur: 4, backgroundOpacity: 0.6 } },
      styles: {
        content: { border: '1px solid var(--border-light)' },
        header: { borderBottom: '1px solid var(--border-light)' },
      },
    },
    Table: {
      styles: {
        th: { color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 },
        tr: { borderColor: 'var(--border-subtle)' },
      },
    },
    TextInput: {
      styles: {
        input: {
          background: 'var(--bg-card)',
          borderColor: 'var(--border-light)',
          color: 'var(--text-default)',
        },
      },
    },
    Select: {
      styles: {
        input: { background: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-default)' },
        dropdown: { background: 'var(--bg-card)', borderColor: 'var(--border-light)' },
      },
    },
    NumberInput: {
      styles: {
        input: { background: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-default)' },
      },
    },
    Textarea: {
      styles: {
        input: { background: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-default)' },
      },
    },
    Button: {
      styles: { root: { fontWeight: 500 } },
    },
    Badge: {
      styles: { root: { fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' } },
    },
  },
  radius: { sm: '6px', md: '10px', lg: '16px', xl: '24px' },
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="auto">
          <Notifications position="bottom-right" limit={5} />
          {children}
        </MantineProvider>
      </body>
    </html>
  )
}
