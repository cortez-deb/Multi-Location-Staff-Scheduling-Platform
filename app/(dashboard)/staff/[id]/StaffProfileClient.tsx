'use client'
import { useState } from 'react'
import { 
  Text, Title, Badge, Paper, Stack, Group, Avatar, Button, 
  Divider, Box, ActionIcon, Tooltip, Alert, Modal
} from '@mantine/core'
import { useRouter } from 'next/navigation'
import type { Session, Location, RecurringAvailability, AvailabilityException, Shift } from '@/lib/types'
import { notifications } from '@mantine/notifications'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function StaffProfileClient({ session, user, locations, availability, recentShifts, history }: {
  session: Session; user: any; locations: Location[]
  availability: { recurring: RecurringAvailability[]; exceptions: AvailabilityException[] }
  recentShifts: Shift[]
  history?: any[]
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const canEdit = session.user.id === user.id || session.user.role !== 'staff'

  async function saveAvail(dayOfWeek: number, startTime: string, endTime: string, available: boolean) {
    setSaving(true)
    try {
      const res = await fetch(`/api/staff/${user.id}/availability`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'recurring', dayOfWeek, startTime, endTime, available }),
      })
      if (res.ok) {
        notifications.show({ title: 'Success', message: 'Availability updated', color: 'green' })
        router.refresh()
      } else {
        const d = await res.json()
        notifications.show({ title: 'Error', message: d.message || 'Failed to update availability', color: 'red' })
      }
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Network error', color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  async function toggleSunday(enabled: boolean, startTime: string = '09:00', endTime: string = '17:00') {
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${user.id}/availability/sunday`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, startTime, endTime })
      })
      if (res.ok) {
        notifications.show({ title: 'Success', message: enabled ? 'Opted-in for Sunday' : 'Opted-out of Sunday', color: 'green' })
        router.refresh()
      } else {
        const d = await res.json()
        notifications.show({ title: 'Error', message: d.message || 'Failed to update Sunday availability', color: 'red' })
      }
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Network error', color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  async function addException(date: string, available: boolean, reason: string) {
    setSaving(true); setMsg('')
    try {
      const res = await fetch(`/api/staff/${user.id}/availability`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'exception', date, available, reason }),
      })
      const d = await res.json()
      if (d.success) { 
        notifications.show({ title: 'Success', message: 'Exception added', color: 'green' })
        router.refresh() 
      } else {
        setMsg(d.error)
        notifications.show({ title: 'Error', message: d.error || 'Failed to add exception', color: 'red' })
      }
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Network error', color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  const userLocs = locations.filter(l => user.certifiedLocations.includes(l.id))

  return (
    <Box p={{ base: 16, sm: 32 }} pb={48} maw={1100} mx="auto">
      <Button 
        variant="subtle" 
        color="gray" 
        size="xs" 
        component="a" 
        href="/staff" 
        mb={24}
        leftSection={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width: 14, height: 14}}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>}
      >
        Back to Directory
      </Button>

      {/* Profile Header Card */}
      <Paper p="xl" radius="lg" withBorder mb={24} className="glass" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <Group justify="space-between" align="flex-start" wrap="wrap" gap={24}>
          <Group gap={20} align="flex-start" flex={1}>
            <Avatar size={80} radius="xl" style={{ background: user.avatarColor, color: '#fff', fontSize: 28, fontWeight: 800 }}>
              {user.avatarInitials}
            </Avatar>
            <Box flex={1}>
              <Group gap={12} mb={8}>
                <Title order={1} size={28} fw={900} lts="-0.02em">{user.name}</Title>
                <Badge 
                  color={user.role === 'manager' || user.role === 'admin' ? 'orange' : 'indigo'} 
                  variant="filled" 
                  radius="sm"
                >
                  {user.role}
                </Badge>
                {!user.isActive && <Badge color="red">Inactive</Badge>}
              </Group>
              
              <Text size="sm" c="dimmed" mb={12} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span>{user.email}</span>
                {user.phone && <span>· {user.phone}</span>}
              </Text>

              <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={8} lts="0.05em">Certified Skills</Text>
              <Group gap={6} mb={16}>
                {user.skills.map((sk: string) => (
                  <Badge key={sk} variant="light" color="indigo" size="sm" radius="xs">
                    {sk.replace('_', ' ')}
                  </Badge>
                ))}
              </Group>

              <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={8} lts="0.05em">Assigned Locations</Text>
              <Group gap={8}>
                {userLocs.map(l => (
                  <Group key={l.id} gap={6} px={10} py={4} bg="rgba(255,255,255,0.03)" style={{ borderRadius: 999, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Box w={6} h={6} bg={l.color} style={{ borderRadius: 999 }} />
                    <Text size="xs" fw={600}>{l.shortName}</Text>
                  </Group>
                ))}
              </Group>
            </Box>
          </Group>

          <Box ta={{ base: 'left', sm: 'right' }}>
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" lts="0.05em" mb={4}>Target Weekly Load</Text>
            <Text fz={36} fw={900} c="indigo" lh={1} mb={4}>{user.desiredHoursPerWeek}h</Text>
            <Text size="xs" c="dimmed">Max {user.maxHoursPerWeek}h / week</Text>
            <Divider my={16} style={{ opacity: 0.1 }} />
            <Text size="xs" c="dimmed">Hired {new Date(user.hireDate).toLocaleDateString()}</Text>
            <Text size="xs" c="dimmed">Reports to: {user.manager?.name || 'Unassigned'}</Text>
          </Box>
        </Group>
      </Paper>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        {/* Recurring Availability Section */}
        <Stack gap={24}>
          <Paper p="xl" radius="lg" withBorder style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <Title order={2} size={18} fw={800} mb={20}>Weekly Availability</Title>
            <Stack gap={12}>
              {DAYS.map((day, dow) => {
                const avail = availability.recurring.find(a => a.dayOfWeek === dow)
                // Logic: Mon-Sat (1-6) available by default. Sun (0) unavailable by default.
                const isDefaultAvailable = dow !== 0
                const isAvailable = avail ? avail.available : isDefaultAvailable
                
                return (
                  <Paper key={dow} p="md" radius="md" withBorder style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.05)' }}>
                    <Group justify="space-between">
                      <Box>
                        <Text fw={700} size="sm">{day}</Text>
                        <Text size="xs" c="dimmed">
                          {avail ? (avail.available ? `${avail.startTime} – ${avail.endTime}` : 'Unavailable') : (isDefaultAvailable ? '00:00 – 23:59 (Default)' : 'Unavailable (Default)')}
                        </Text>
                      </Box>
                      <Group gap={8}>
                        {isAvailable ? (
                          <Badge color="green" variant="light" size="sm">Available</Badge>
                        ) : (
                          <Badge color="gray" variant="light" size="sm">Off</Badge>
                        )}
                        {canEdit && (
                          <AvailabilityEditor 
                            day={day} 
                            dow={dow} 
                            current={avail} 
                            isDefaultAvailable={isDefaultAvailable}
                            onSave={dow === 0 ? toggleSunday : saveAvail}
                            saving={saving}
                          />
                        )}
                      </Group>
                    </Group>
                  </Paper>
                )
              })}
            </Stack>
          </Paper>
        </Stack>

        {/* Exceptions & History Section */}
        <Stack gap={24}>
          {/* One-off Exceptions */}
          <Paper p="xl" radius="lg" withBorder style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <Title order={2} size={18} fw={800} mb={20}>Time-off & Exceptions</Title>
            {canEdit && (
              <ExceptionForm onSubmit={addException} saving={saving} msg={msg} />
            )}
            <Stack gap={10} mt={16}>
              {availability.exceptions.length === 0 && (
                <Text size="sm" c="dimmed" ta="center" py={20}>No active exceptions or time-off requests.</Text>
              )}
              {availability.exceptions.slice(0, 5).map(e => (
                <Paper key={e.id} p="sm" radius="md" withBorder style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.05)' }}>
                  <Group justify="space-between">
                    <Box>
                      <Text size="sm" fw={700}>{new Date(e.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                      {e.reason && <Text size="xs" c="dimmed">{e.reason}</Text>}
                    </Box>
                    <Badge color={e.available ? 'green' : 'red'} variant="light">
                      {e.available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Paper>

          {/* Recent History */}
          <Paper p="xl" radius="lg" withBorder style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <Title order={2} size={18} fw={800} mb={20}>Recent Activity</Title>
            <Stack gap={12}>
              {recentShifts.length === 0 && <Text size="sm" c="dimmed" ta="center" py={20}>No recent shift history found.</Text>}
              {recentShifts.slice(0, 5).map(s => {
                const loc = locations.find(l => l.id === s.locationId)
                return (
                  <Paper key={s.id} p="sm" radius="md" withBorder style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.05)' }}>
                    <Group justify="space-between">
                      <Box>
                        <Text size="sm" fw={700}>{s.date}</Text>
                        <Text size="xs" c="dimmed">{s.startTime} – {s.endTime} · {loc?.shortName}</Text>
                      </Box>
                      <Badge variant="outline" color="indigo" size="xs">{s.requiredSkill.replace('_',' ')}</Badge>
                    </Group>
                  </Paper>
                )
              })}
            </Stack>
          </Paper>
        </Stack>
      </div>

      {/* Admin Reporting History */}
      {session.user.role === 'admin' && history && history.length > 0 && (
        <Paper p="xl" radius="lg" withBorder mt={24} style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <Title order={2} size={18} fw={800} mb={24}>Managerial Assignment History</Title>
          <Stack gap={16}>
            {history.map(item => (
              <Group key={item.id} gap={20} wrap="nowrap">
                <Box w={8} h={8} bg={item.supersededAt ? 'rgba(255,255,255,0.1)' : '#10b981'} style={{ borderRadius: 999 }} />
                <Box flex={1}>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm" fw={800}>{item.manager?.name || 'Unassigned'}</Text>
                    <Text size="xs" c="dimmed">
                      {new Date(item.assignedAt).toLocaleDateString()} – {item.supersededAt ? new Date(item.supersededAt).toLocaleDateString() : 'Present'}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">Assignment handled by {item.assignedBy?.name || 'System Auto-Route'}</Text>
                </Box>
              </Group>
            ))}
          </Stack>
        </Paper>
      )}
    </Box>
  )
}

function AvailabilityEditor({ day, dow, current, isDefaultAvailable, onSave, saving }: { 
  day: string, dow: number, current?: RecurringAvailability, isDefaultAvailable: boolean, onSave: any, saving: boolean 
}) {
  const [open, setOpen] = useState(false)
  const [available, setAvailable] = useState(current ? current.available : isDefaultAvailable)
  const [start, setStart] = useState(current?.startTime || '09:00')
  const [end, setEnd] = useState(current?.endTime || '17:00')

  const handleSave = () => {
    if (dow === 0) {
      onSave(available, start, end)
    } else {
      onSave(dow, start, end, available)
    }
    setOpen(false)
  }

  return (
    <>
      <ActionIcon variant="light" color="indigo" onClick={() => setOpen(true)} disabled={saving}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width: 16, height: 16}}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
      </ActionIcon>

      <Modal opened={open} onClose={() => setOpen(false)} title={`Edit ${day} Availability`} centered radius="md">
        <Stack gap={16}>
          <Paper p="sm" withBorder radius="md" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <Group justify="space-between">
              <Text size="sm" fw={600}>Recurring Availability</Text>
              <Button 
                size="compact-xs" 
                variant={available ? 'filled' : 'light'} 
                color={available ? 'green' : 'gray'}
                onClick={() => setAvailable(!available)}
              >
                {available ? 'Available' : 'Unavailable'}
              </Button>
            </Group>
          </Paper>

          {available && (
            <Group grow gap={12}>
              <Box>
                <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>Start Time</Text>
                <input 
                  type="time" 
                  value={start} 
                  onChange={e => setStart(e.target.value)} 
                  style={{ 
                    width: '100%', padding: '8px', borderRadius: '4px', 
                    background: 'var(--mantine-color-dark-6)', border: '1px solid var(--mantine-color-dark-4)',
                    color: 'white'
                  }} 
                />
              </Box>
              <Box>
                <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>End Time</Text>
                <input 
                  type="time" 
                  value={end} 
                  onChange={e => setEnd(e.target.value)} 
                  style={{ 
                    width: '100%', padding: '8px', borderRadius: '4px', 
                    background: 'var(--mantine-color-dark-6)', border: '1px solid var(--mantine-color-dark-4)',
                    color: 'white'
                  }} 
                />
              </Box>
            </Group>
          )}

          <Button fullWidth onClick={handleSave} color="indigo" mt={12}>
            Save {day} Schedule
          </Button>
        </Stack>
      </Modal>
    </>
  )
}

function ExceptionForm({ onSubmit, saving, msg }: { onSubmit: (date: string, available: boolean, reason: string) => void; saving: boolean; msg: string }) {
  const [date, setDate] = useState('')
  const [available, setAvailable] = useState(false)
  const [reason, setReason] = useState('')

  return (
    <Paper p="md" radius="md" withBorder style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.05)' }}>
      <Stack gap={12}>
        <Group grow gap={12}>
          <Box>
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>Date</Text>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              style={{ 
                width: '100%', padding: '8px', borderRadius: '4px', 
                background: 'var(--mantine-color-dark-6)', border: '1px solid var(--mantine-color-dark-4)',
                color: 'white'
              }} 
            />
          </Box>
          <Box>
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>Status</Text>
            <Button 
              fullWidth 
              variant="light" 
              color={available ? 'green' : 'red'} 
              onClick={() => setAvailable(!available)}
              size="sm"
            >
              {available ? 'Extra Available' : 'Unavailable'}
            </Button>
          </Box>
        </Group>
        <Box>
          <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>Reason / Note</Text>
          <input 
            placeholder="Vacation, doctor's appointment, etc."
            value={reason} 
            onChange={e => setReason(e.target.value)} 
            style={{ 
              width: '100%', padding: '8px', borderRadius: '4px', 
              background: 'var(--mantine-color-dark-6)', border: '1px solid var(--mantine-color-dark-4)',
              color: 'white'
            }} 
          />
        </Box>
        <Button 
          onClick={() => date && onSubmit(date, available, reason)} 
          disabled={!date || saving}
          loading={saving}
          fullWidth
          variant="filled"
          color="indigo"
        >
          Add Exception
        </Button>
      </Stack>
    </Paper>
  )
}

