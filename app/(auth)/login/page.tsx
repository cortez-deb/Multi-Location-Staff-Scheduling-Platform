'use client'
import { useActionState } from 'react'
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Stack,
  Alert,
  Box,
  Group,
  Divider,
  Badge,
} from '@mantine/core'
import { loginAction } from '@/app/actions/auth'

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, {} as any)

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.15), transparent)',
      }}
    >
      <Box style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <Stack align="center" mb={32} gap={8}>
          <Box
            style={{
              width: 56, height: 56,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 32, height: 32}}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
          </Box>
          <Title order={1} className="gradient-text" style={{ fontSize: 28 }}>ShiftSync</Title>
          <Text size="sm" c="dimmed">Coastal Eats Workforce Platform</Text>
        </Stack>

        <Paper p={32} radius="lg" withBorder style={{ borderColor: 'var(--border-light)', background: 'var(--bg-cell)' }}>
          <Title order={2} size="h3" mb="lg">Welcome back</Title>

          <form action={action}>
            <Stack gap="md">
              <TextInput
                name="email"
                type="email"
                label="Email address"
                placeholder="you@coastaleats.com"
                required
                autoComplete="email"
                defaultValue=""
              />
              <PasswordInput
                name="password"
                label="Password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />

              {state?.error && (
                <Alert color="red" radius="md" styles={{ root: { background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' } }}>
                  {state.error}
                </Alert>
              )}

              <Button type="submit" fullWidth loading={pending} mt={4}
                variant="gradient" gradient={{ from: '#6366f1', to: '#4f46e5' }}
              >
                {pending ? 'Signing in…' : 'Sign in'}
              </Button>
            </Stack>
          </form>

          <Divider my="lg" color="var(--border-subtle)" />

          {/* Demo credentials */}
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts="0.08em" mb={10}>
            Demo Credentials
          </Text>
          <Stack gap={6}>
            {[
              { role: 'Admin', email: 'admin@coastaleats.com', pass: 'admin123', color: '#f59e0b' },
              { role: 'Manager (LA)', email: 'sarah.mgr@coastaleats.com', pass: 'manager123', color: '#6366f1' },
              { role: 'Manager (Miami)', email: 'carlos.mgr@coastaleats.com', pass: 'manager123', color: '#06b6d4' },
              { role: 'Staff', email: 'alex@coastaleats.com', pass: 'staff123', color: '#ec4899' },
            ].map(c => (
              <Box key={c.email} p="sm" style={{ background: 'var(--bg-card)', borderRadius: 8 }}>
                <Group justify="space-between" align="center">
                  <Group gap={8}>
                    <Box style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
                    <Text size="xs" fw={600} c="gray.2">{c.role}</Text>
                  </Group>
                  <Stack gap={0} align="flex-end">
                    <Text size="xs" c="dimmed">{c.email}</Text>
                    <Text size="xs" c="gray.3">{c.pass}</Text>
                  </Stack>
                </Group>
              </Box>
            ))}
          </Stack>
        </Paper>
      </Box>
    </Box>
  )
}
