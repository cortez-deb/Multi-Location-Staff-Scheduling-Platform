'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Box, Group, Stack, Text, Title, Badge, Button, Paper, Anchor, Indicator,
} from '@mantine/core'
import type { Session, AppNotification } from '@/lib/types'

const TYPE_ICONS: Record<string, string> = {
  shift_assigned: '📋', shift_changed: '✏️', schedule_published: '✅',
  swap_requested: '🔄', swap_accepted: '🤝', swap_approved: '✓',
  swap_rejected: '✗', swap_cancelled: '✕', drop_claimed: '⬇',
  overtime_warning: '⚠️', availability_changed: '📅', shift_removed: '🗑',
  override_required: '🔒',
}

export function NotificationsClient({ session, initialNotifs }: { session: Session; initialNotifs: AppNotification[] }) {
  const router = useRouter()
  const [notifs, setNotifs] = useState(initialNotifs)
  const [loading, setLoading] = useState(false)

  const unread = notifs.filter(n => !n.read).length

  async function markAll() {
    setLoading(true)
    await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAll: true }) })
    setNotifs(n => n.map(x => ({ ...x, read: true })))
    setLoading(false)
    router.refresh()
  }

  async function markOne(id: string) {
    await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) })
    setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x))
  }

  const grouped = notifs.reduce<{ unread: AppNotification[]; read: AppNotification[] }>(
    (acc, n) => { acc[n.read ? 'read' : 'unread'].push(n); return acc },
    { unread: [], read: [] }
  )

  return (
    <Box p={32} pb={48} maw={720} mx="auto">
      <Group align="flex-end" justify="space-between" mb={28} gap={12}>
        <Box>
          <Title order={1} size={24} fw={800}>Notifications</Title>
          <Text size="sm" c="dimmed" mt={4}>
            {unread > 0 ? `${unread} unread` : 'All caught up!'}
          </Text>
        </Box>
        {unread > 0 && (
          <Button size="sm" variant="default" loading={loading} onClick={markAll}>
            ✓ Mark all read
          </Button>
        )}
      </Group>

      {notifs.length === 0 && (
        <Box style={{ textAlign: 'center', padding: '80px 24px' }}>
          <Text size="3rem" mb={12}>🔔</Text>
          <Text c="dimmed">No notifications yet</Text>
        </Box>
      )}

      {[{ label: 'Unread', items: grouped.unread }, { label: 'Earlier', items: grouped.read }].map(({ label, items }) =>
        items.length > 0 && (
          <Box key={label} mb={32}>
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts="0.08em" mb={12}>
              {label} ({items.length})
            </Text>
            <Stack gap={8}>
              {items.map(n => (
                <Paper
                  key={n.id}
                  p="md"
                  radius="lg"
                  onClick={() => { if (!n.read) markOne(n.id) }}
                  style={{
                    background: n.read ? 'var(--bg-cell)' : 'rgba(99,102,241,0.07)',
                    border: `1px solid ${n.read ? 'var(--border-light)' : 'rgba(99,102,241,0.2)'}`,
                    cursor: n.read ? 'default' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <Group gap={14} align="flex-start" wrap="nowrap">
                    <Text size="xl" style={{ flexShrink: 0 }}>{TYPE_ICONS[n.type] ?? '🔔'}</Text>
                    <Box flex={1} style={{ minWidth: 0 }}>
                      <Group justify="space-between" gap={8} mb={2}>
                        <Text fw={n.read ? 500 : 700} size="sm">{n.title}</Text>
                        {!n.read && (
                          <Box style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: 4 }} />
                        )}
                      </Group>
                      <Text size="xs" c="gray.4">{n.message}</Text>
                      <Text size="xs" c="dimmed" mt={4}>{new Date(n.createdAt).toLocaleString()}</Text>
                      {(n.relatedShiftId || n.relatedSwapId) && (
                        <Group gap={8} mt={8}>
                          {n.relatedShiftId && (
                            <Anchor component={Link} href={`/shifts/${n.relatedShiftId}`} size="xs" c="indigo">
                              View Shift →
                            </Anchor>
                          )}
                          {n.relatedSwapId && (
                            <Anchor component={Link} href="/swaps" size="xs" c="indigo">
                              View Swaps →
                            </Anchor>
                          )}
                        </Group>
                      )}
                    </Box>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Box>
        )
      )}
    </Box>
  )
}
