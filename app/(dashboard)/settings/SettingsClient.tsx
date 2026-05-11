'use client'
import { useState, useEffect } from 'react'
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

export function SettingsClient({ user, allSkills }: { user: any; allSkills: { id: string, name: string }[] }) {
  const [prefs, setPrefs] = useState({
    inApp: user.notifyInApp ?? true,
    emailSimulation: user.notifyEmail ?? false
  })
  const [desiredHours, setDesiredHours] = useState<number | string>(user.desiredHoursPerWeek || user.desiredHours || 40)
  const [sundayEnabled, setSundayEnabled] = useState(false)
  const [sundayStart, setSundayStart] = useState('09:00')
  const [sundayEnd, setSundayEnd] = useState('17:00')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadAvailability() {
      try {
        const res = await fetch(`/api/users/${user.id}/availability`)
        if (res.ok) {
          const data = await res.json()
          const sun = (data.availabilities || []).find((a: any) => a.dayOfWeek === 0)
          if (sun) {
            setSundayEnabled(true)
            setSundayStart(sun.startTime)
            setSundayEnd(sun.endTime)
          }
        }
      } catch (err) {
        console.error('Failed to load availability', err)
      }
    }
    loadAvailability()
  }, [user.id])

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notifyInApp: prefs.inApp,
        notifyEmail: prefs.emailSimulation,
        desiredHours: Number(desiredHours),
        name: user.name,
        email: user.email
      }),
    })

    // Also save Sunday availability
    await fetch(`/api/users/${user.id}/availability/sunday`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        enabled: sundayEnabled, 
        startTime: sundayStart, 
        endTime: sundayEnd 
      })
    })
    
    if (!res.ok) {
      const d = await res.json()
      notifications.show({ title: 'Error', message: d.message || 'Failed to update settings', color: 'red' })
    } else {
      notifications.show({ title: 'Settings saved', message: 'Your preferences have been updated.', color: 'green', autoClose: 3000 })
    }
    setSaving(false)
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
            <Text size="sm">{user.createdAt}</Text>
          </Box>
          <Box>
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts="0.05em" mb={4}>Manager</Text>
            <Text size="sm">{user.managerName}</Text>
          </Box>
          <Box>
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts="0.05em" mb={4}>Skills</Text>
            <Group gap={4} wrap="wrap">
              {user.skills.map((sid: string) => {
                const sObj = allSkills.find(s => s.id === sid)
                const label = sObj?.name || sid
                const slug = label.toLowerCase().replace(' ', '_')
                return (
                  <Badge key={sid} size="xs" variant="light"
                    style={{ background: `${SKILL_COLORS[slug] ?? '#6366f1'}22`, color: SKILL_COLORS[slug] ?? '#6366f1', border: `1px solid ${SKILL_COLORS[slug] ?? '#6366f1'}44` }}>
                    {label.replace('_', ' ')}
                  </Badge>
                )
              })}
            </Group>
          </Box>
        </Group>
      </Paper>

      {/* Preferences */}
      <Paper p="xl" radius="lg" mb={24} withBorder style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <Title order={2} size="h4" mb={20}>Preferences</Title>

        <Group align="flex-end" gap={32} mb={20} wrap="wrap">
          <Box style={{ minWidth: 160 }}>
            <NumberInput
              label="Desired Hours per Week"
              description="Target weekly load"
              min={1}
              max={60}
              value={desiredHours}
              onChange={setDesiredHours}
            />
          </Box>

          <Box flex={1} style={{ minWidth: 280 }}>
            <Paper p="sm" radius="md" withBorder style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.05)' }}>
              <Group justify="space-between" mb={sundayEnabled ? 10 : 0}>
                <Box>
                  <Text size="sm" fw={700}>Available on Sundays?</Text>
                  <Text size="xs" c="dimmed">Sundays are optional</Text>
                </Box>
                <Switch 
                  checked={sundayEnabled} 
                  onChange={(e) => setSundayEnabled(e.currentTarget.checked)}
                  color="indigo"
                />
              </Group>

              {sundayEnabled && (
                <Group grow gap={10}>
                  <Box>
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>Start</Text>
                    <input 
                      type="time" 
                      value={sundayStart} 
                      onChange={e => setSundayStart(e.target.value)} 
                      style={{ 
                        width: '100%', padding: '6px', borderRadius: '4px', 
                        background: 'var(--mantine-color-dark-6)', border: '1px solid var(--mantine-color-dark-4)',
                        color: 'white', fontSize: '12px'
                      }} 
                    />
                  </Box>
                  <Box>
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>End</Text>
                    <input 
                      type="time" 
                      value={sundayEnd} 
                      onChange={e => setSundayEnd(e.target.value)} 
                      style={{ 
                        width: '100%', padding: '6px', borderRadius: '4px', 
                        background: 'var(--mantine-color-dark-6)', border: '1px solid var(--mantine-color-dark-4)',
                        color: 'white', fontSize: '12px'
                      }} 
                    />
                  </Box>
                </Group>
              )}
            </Paper>
          </Box>
        </Group>

        <Box>
          <Text size="sm" fw={500} c="gray.4" mb={12}>Notification Preferences</Text>
          <Stack gap={12}>
            {(
              [
                { key: 'inApp', label: 'In-App Notifications', desc: 'Bell icon and toast messages' },
                { key: 'emailSimulation', label: 'Email Notifications (Simulated)', desc: 'Logged to console in demo mode' },
              ] as const
            ).map(({ key, label, desc }) => (
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
