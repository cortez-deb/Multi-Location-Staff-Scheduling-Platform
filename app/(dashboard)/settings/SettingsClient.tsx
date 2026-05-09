'use client'
import { useState } from 'react'
import {
  Box, Group, Stack, Text, Title, Badge, Avatar, Button, Paper,
  NumberInput, Divider, Switch,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'

const ROLE_COLOR: Record<string, string> = { admin: 'red', manager: 'yellow', staff: 'cyan' }

const SKILL_COLORS: Record<string, string> = {
  bartender: '#a78bfa', line_cook: '#fb923c', server: '#22d3ee',
  host: '#34d399', supervisor: '#fbbf24', expo: '#fb7185', busser: '#94a3b8',
}

export function SettingsClient({ user }: { user: any }) {
  const [prefs, setPrefs] = useState(user.notificationPrefs)
  const [desiredHours, setDesiredHours] = useState<number | string>(user.desiredHoursPerWeek)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await fetch(`/api/staff/${user.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationPrefs: prefs, desiredHoursPerWeek: desiredHours }),
    })
    setSaving(false)
    notifications.show({ title: 'Settings saved', message: 'Your preferences have been updated.', color: 'green', autoClose: 3000 })
  }

  return (
    <Box p={32} pb={48} maw={640} mx="auto">
      <Title order={1} size={24} fw={800} mb={28}>Settings</Title>

      {/* Profile card */}
      <Paper p="xl" radius="lg" mb={24} withBorder style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <Group gap={16} mb={20} align="flex-start">
          <Avatar size={56} radius="xl" style={{ background: user.avatarColor, color: '#fff', fontSize: 20, fontWeight: 700 }}>
            {user.avatarInitials}
          </Avatar>
          <Box>
            <Text fw={700} size="lg">{user.name}</Text>
            <Text size="sm" c="dimmed">{user.email}</Text>
            <Badge size="sm" color={ROLE_COLOR[user.role] ?? 'gray'} variant="light" mt={4}>
              {user.role}
            </Badge>
          </Box>
        </Group>
        <Divider mb={20} color="rgba(255,255,255,0.06)" />
        <Group gap={16} grow>
          <Box>
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts="0.05em" mb={4}>Hire Date</Text>
            <Text size="sm">{user.hireDate}</Text>
          </Box>
          <Box>
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts="0.05em" mb={4}>Manager</Text>
            <Text size="sm">{user.managerName}</Text>
          </Box>
          <Box>
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts="0.05em" mb={4}>Skills</Text>
            <Group gap={4} wrap="wrap">
              {user.skills.map((s: string) => (
                <Badge key={s} size="xs" variant="light"
                  style={{ background: `${SKILL_COLORS[s]}22`, color: SKILL_COLORS[s], border: `1px solid ${SKILL_COLORS[s]}44` }}>
                  {s.replace('_', ' ')}
                </Badge>
              ))}
            </Group>
          </Box>
        </Group>
      </Paper>

      {/* Preferences */}
      <Paper p="xl" radius="lg" mb={24} withBorder style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <Title order={2} size="h4" mb={20}>Preferences</Title>

        <Box mb={20}>
          <NumberInput
            label="Desired Hours per Week"
            description="Used for fairness analytics and scheduling recommendations"
            min={1}
            max={60}
            value={desiredHours}
            onChange={setDesiredHours}
            style={{ maxWidth: 160 }}
          />
        </Box>

        <Box>
          <Text size="sm" fw={500} c="gray.4" mb={12}>Notification Preferences</Text>
          <Stack gap={12}>
            {[
              { key: 'inApp', label: 'In-App Notifications', desc: 'Bell icon and toast messages' },
              { key: 'emailSimulation', label: 'Email Notifications (Simulated)', desc: 'Logged to console in demo mode' },
            ].map(({ key, label, desc }) => (
              <Paper key={key} p="sm" radius="md" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <Group justify="space-between" align="center">
                  <Box>
                    <Text size="sm" fw={600}>{label}</Text>
                    <Text size="xs" c="dimmed">{desc}</Text>
                  </Box>
                  <Switch
                    checked={!!prefs[key]}
                    onChange={() => setPrefs((p: any) => ({ ...p, [key]: !p[key] }))}
                    color="indigo"
                  />
                </Group>
              </Paper>
            ))}
          </Stack>
        </Box>
      </Paper>

      <Button
        size="md"
        loading={saving}
        onClick={save}
        variant="gradient"
        gradient={{ from: '#6366f1', to: '#4f46e5' }}
      >
        Save Changes
      </Button>
    </Box>
  )
}
