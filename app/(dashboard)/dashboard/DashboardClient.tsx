'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Box, Group, Stack, Text, Title, Badge, Avatar, Paper,
  SimpleGrid, Button, Divider,
} from '@mantine/core'
import { useSocket } from '../../hooks/useSocket'
import type { Session, Location } from '@/lib/types'

type Props = {
  session: Session
  onDutyNow: any[]
  stats: Record<string, number>
  overtimeWarnings: { userId: string; name: string; hours: number; isOvertime: boolean }[]
  locations: Location[]
  skills: { id: string; name: string }[]
  today: string
}

const SKILL_LABELS: Record<string, string> = {
  bartender: 'Bartender', line_cook: 'Line Cook', server: 'Server',
  host: 'Host', supervisor: 'Supervisor', expo: 'Expo', busser: 'Busser',
}

const SKILL_COLORS: Record<string, string> = {
  bartender: '#a78bfa', line_cook: '#fb923c', server: '#22d3ee',
  host: '#34d399', supervisor: '#fbbf24', expo: '#fb7185', busser: '#94a3b8',
}

export function DashboardClient({ session, onDutyNow: initial, stats: initialStats, overtimeWarnings, locations, skills, today }: Props) {
  const router = useRouter()
  const [onDuty, setOnDuty] = useState(initial)
  const [stats, setStats] = useState(initialStats)

  useSocket(session, (event) => {
    if (event === 'shift_updated' || event === 'shift_assigned' || event === 'schedule_published') {
      router.refresh()
    }
  })

  const isManager = session.user.role === 'manager' || session.user.role === 'admin'

  return (
    <Box p={32} pb={48} maw={1280} mx="auto">
      {/* Header */}
      <Box mb={32}>
        <Group gap={10} mb={6}>
          <Box className="live-dot" />
          <Text size="xs" c="green" fw={600}>LIVE</Text>
        </Group>
        <Title order={1} size={28} fw={800}>
          Good {getTimeOfDay()}, {session.user.name.split(' ')[0]} 👋
        </Title>
        <Text size="sm" c="dimmed" mt={6}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · Coastal Eats Operations
        </Text>
      </Box>

      {/* Stats Grid */}
      <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} mb={32} spacing="md">
        <StatCard icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 24, height: 24}}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>} label="Staff On Duty" value={stats.staffOnDuty} color="#10b981" />
        <StatCard icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 24, height: 24}}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 15.75h3.75M18 9.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25V4.5a2.25 2.25 0 0 1 2.25-2.25h7.5c.621 0 1.125.504 1.125 1.125v4.5Zm0 0v-4.5h4.5m-4.5 4.5v-4.5h4.5" /></svg>} label="Shifts Today" value={stats.shiftsToday} color="#6366f1" />
        <StatCard icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 24, height: 24}}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>} label="Pending Swaps" value={stats.pendingSwaps} color="#f59e0b" alert={stats.pendingSwaps > 0} />
        {isManager && <StatCard icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 24, height: 24}}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>} label="Draft Shifts" value={stats.draftShifts} color="#06b6d4" />}
        {isManager && <StatCard icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 24, height: 24}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2.25m0 4.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>} label="Overtime Risk" value={stats.overtimeCount} color="#ef4444" alert={stats.overtimeCount > 0} />}
        <StatCard icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 24, height: 24}}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>} label="Total Staff" value={stats.totalStaff} color="#8b5cf6" />
      </SimpleGrid>

      <Group align="flex-start" gap={24} wrap="nowrap" style={{ alignItems: 'stretch' }}>
        {/* On Duty Now */}
        <Box flex={1} style={{ minWidth: 0 }}>
          <Group gap={10} mb={16} align="center">
            <Box className="live-dot" />
            <Title order={2} size={18} fw={700}>On Duty Now</Title>
            <Text size="xs" c="dimmed" ml="auto">Auto-updates in real time</Text>
          </Group>
          {onDuty.length === 0 ? (
            <Paper p="xl" radius="lg" withBorder style={{ textAlign: 'center', borderColor: 'var(--border-light)' }}>
              <Text size="2.5rem" mb={12} c="dimmed">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 40, height: 40, display: 'inline-block'}}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                </svg>
              </Text>
              <Text c="dimmed">No active shifts right now</Text>
            </Paper>
          ) : (
            <Stack gap={12}>
              {locations.map(loc => {
                const locShifts = onDuty.filter(s => s.locationId === loc.id)
                if (locShifts.length === 0) return null
                return (
                  <Paper key={loc.id} p="md" radius="lg" withBorder
                    style={{ borderColor: 'rgba(255,255,255,0.08)', borderLeft: `3px solid ${loc.color}` }}>
                    <Group gap={8} mb={12} align="center">
                      <Box style={{ width: 10, height: 10, borderRadius: '50%', background: loc.color }} />
                      <Text fw={700} size="sm">{loc.shortName}</Text>
                      <Text size="xs" c="dimmed">{loc.city}</Text>
                    </Group>
                    <Stack gap={8}>
                      {locShifts.map(shift => (
                        <Box key={shift.id} p="sm" style={{ background: 'var(--bg-card)', borderRadius: 8 }}>
                          <Group gap={12} align="center">
                            <Badge size="sm" variant="light"
                              style={{
                                background: `${SKILL_COLORS[skills.find(sk => sk.id === shift.requiredSkill)?.name.toLowerCase().replace(' ', '_') ?? ''] || '#6366f1'}22`,
                                color: SKILL_COLORS[skills.find(sk => sk.id === shift.requiredSkill)?.name.toLowerCase().replace(' ', '_') ?? ''] || '#6366f1',
                              }}>
                              {skills.find(sk => sk.id === shift.requiredSkill)?.name || shift.requiredSkill}
                            </Badge>
                            <Text size="sm" c="dimmed">{shift.startTime} – {shift.endTime}</Text>
                            <Group gap={0} ml="auto">
                              {(shift.staff ?? []).map((s: any) => (
                                <Avatar key={s.id} title={s.name} size={28} radius="xl"
                                  style={{ background: s.avatarColor, color: '#fff', fontSize: 10, fontWeight: 700, marginLeft: -6, border: '2px solid var(--bg-card)' }}>
                                  {s.avatarInitials}
                                </Avatar>
                              ))}
                            </Group>
                          </Group>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                )
              })}
            </Stack>
          )}
        </Box>

        {/* Right column */}
        <Stack gap={20} style={{ width: 360, flexShrink: 0 }}>
          {/* Overtime alerts */}
          {isManager && overtimeWarnings.length > 0 && (
            <Paper p="md" radius="lg" withBorder style={{ borderColor: 'var(--border-light)' }}>
              <Group gap={8} mb={14}>
                <Text c="yellow">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 18, height: 18}}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2.25m0 4.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </Text>
                <Text size="sm" fw={700} c="yellow">Overtime Alerts</Text>
              </Group>
              <Stack gap={8}>
                {overtimeWarnings.slice(0, 6).map(w => (
                  <Group key={w.userId} gap={10} align="center">
                    <Box flex={1}>
                      <Text size="sm" fw={600}>{w.name}</Text>
                      <Text size="xs" c="dimmed">{w.hours}h this week</Text>
                    </Box>
                    <Badge size="sm" color={w.isOvertime ? 'red' : 'yellow'} variant="light">
                      {w.isOvertime ? `OT +${(w.hours - 40).toFixed(1)}h` : `${w.hours}h`}
                    </Badge>
                  </Group>
                ))}
              </Stack>
            </Paper>
          )}

          {/* Locations */}
          <Paper p="md" radius="lg" withBorder style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <Text size="sm" fw={700} mb={14}>Locations</Text>
            <Stack gap={10}>
              {locations.map(loc => {
                const active = onDuty.filter(s => s.locationId === loc.id)
                const count = active.reduce((n: number, s: any) => n + (s.staff?.length ?? 0), 0)
                return (
                  <Group key={loc.id} gap={10} align="center">
                    <Box style={{ width: 10, height: 10, borderRadius: '50%', background: loc.color, flexShrink: 0 }} />
                    <Box flex={1}>
                      <Text size="sm" fw={600}>{loc.shortName}</Text>
                      <Text size="xs" c="dimmed">{loc.timezone.split('/')[1]?.replace('_', ' ')}</Text>
                    </Box>
                    <Badge size="sm" color={count > 0 ? 'green' : 'gray'} variant="light">
                      {count > 0 ? `${count} on duty` : 'Quiet'}
                    </Badge>
                  </Group>
                )
              })}
            </Stack>
          </Paper>

          {/* Quick Actions */}
          {isManager && (
            <Paper p="md" radius="lg" withBorder style={{ borderColor: 'var(--border-light)' }}>
              <Text size="sm" fw={700} mb={14}>Quick Actions</Text>
              <Stack gap={8}>
                <Button component={Link} href="/schedule" fullWidth justify="flex-start" leftSection={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 16, height: 16}}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 2.994v2.25m10.5-2.25v2.25m-14.252 13.5V7.491a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v11.251m-18 0a2.25 2.25 0 0 0 2.25 2.25h13.5a2.25 2.25 0 0 0 2.25-2.25m-18 0v-7.5a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v7.5m-6.75-6h2.25m-9 2.25h4.5m.002-2.25h.005v.006H12v-.006Zm-.001 4.5h.006v.006h-.006v-.005Zm-2.25.001h.005v.006H9.75v-.006Zm-2.25 0h.005v.005h-.006v-.005Zm6.75-2.247h.005v.005h-.005v-.005Zm0 2.247h.006v.006h-.006v-.006Zm2.25-2.248h.006V15H16.5v-.005Z" /></svg>}
                  variant="gradient" gradient={{ from: '#6366f1', to: '#4f46e5' }} size="sm">
                  View Schedule
                </Button>
                <Button component={Link} href="/shifts" fullWidth justify="flex-start" leftSection={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 16, height: 16}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>}
                  variant="default" size="sm">
                  Create Shift
                </Button>
                <Button component={Link} href="/swaps" fullWidth justify="flex-start" leftSection={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 16, height: 16}}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>}
                  variant="default" size="sm">
                  Review Swaps
                </Button>
                <Button component={Link} href="/analytics" fullWidth justify="flex-start" leftSection={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 16, height: 16}}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>}
                  variant="default" size="sm">
                  Analytics
                </Button>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Group>
    </Box>
  )
}

function StatCard({ icon, label, value, color, alert }: { icon: React.ReactNode; label: string; value: number; color: string; alert?: boolean }) {
  return (
    <Paper p="md" radius="lg" withBorder
      style={{
        borderColor: alert ? `${color}44` : 'var(--border-light)',
        display: 'flex', flexDirection: 'column', gap: 8,
        transition: 'all 0.2s',
      }}
    >
      <Text size="xl" c={color} style={{ display: 'flex', alignItems: 'center' }}>{icon}</Text>
      <Text size="2rem" fw={800} c={color} lh={1}>{value}</Text>
      <Text size="xs" c="dimmed" fw={500}>{label}</Text>
    </Paper>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
