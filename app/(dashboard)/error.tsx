'use client'

import { useEffect, useState } from 'react'
import { Modal, Button, Text, Stack, Group, ThemeIcon } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { logoutAction } from '@/app/actions/auth'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const [opened, setOpened] = useState(false)

  useEffect(() => {
    // If it's the specific API unauthorized error or a generic 401 message
    if (error.name === 'ApiUnauthorizedError' || error.message?.includes('Unauthorized')) {
      setOpened(true)
    } else {
      // Log other unexpected errors
      console.error('Dashboard Error Boundary Caught:', error)
    }
  }, [error])

  const handleLoginRedirect = async () => {
    setOpened(false)
    await logoutAction()
    window.location.href = '/login'
  }

  // If it's not an unauthorized error, we can still show a generic error state
  // But for ApiUnauthorizedError, we rely on the modal overlaying a blank screen
  // or whatever the error boundary replaces. We'll return an empty div to serve
  // as the background behind the modal.
  if (error.name === 'ApiUnauthorizedError' || error.message?.includes('Unauthorized')) {
    return (
      <div style={{ height: '100vh', width: '100%', backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Modal
          opened={opened}
          onClose={handleLoginRedirect}
          withCloseButton={false}
          centered
          closeOnClickOutside={false}
          closeOnEscape={false}
          overlayProps={{
            backgroundOpacity: 0.55,
            blur: 3,
          }}
        >
          <Stack align="center" gap="md" py="xl">
            <ThemeIcon size={64} radius="100%" color="red.6" variant="light">
              <IconAlertTriangle size={32} />
            </ThemeIcon>
            <Text size="xl" fw={700} ta="center">
              Not Authorized
            </Text>
            <Text c="dimmed" ta="center" size="sm" maw={300}>
              Your session has expired or you do not have permission to view this page. Please log in again to continue.
            </Text>
            <Button onClick={handleLoginRedirect} size="md" mt="md" fullWidth>
              Return to Login
            </Button>
          </Stack>
        </Modal>
      </div>
    )
  }

  // Generic fallback for non-401 errors
  return (
    <div style={{ height: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Stack align="center" gap="md">
        <ThemeIcon size={64} radius="100%" color="red.6" variant="light">
          <IconAlertTriangle size={32} />
        </ThemeIcon>
        <Text size="xl" fw={700}>Something went wrong!</Text>
        <Text c="dimmed">{error.message || 'An unexpected error occurred.'}</Text>
        <Group>
          <Button variant="default" onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
          <Button onClick={() => reset()}>Try again</Button>
        </Group>
      </Stack>
    </div>
  )
}
