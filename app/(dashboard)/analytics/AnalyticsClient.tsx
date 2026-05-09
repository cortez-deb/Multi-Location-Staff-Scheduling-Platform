'use client'
import {
  Box, Group, Stack, Text, Title, Badge, Avatar, Paper,
  SimpleGrid, Table, Progress,
} from '@mantine/core'
import type { Session, Location } from '@/lib/types'

export function AnalyticsClient({ session, summaries, overallFairness, weekStart, weekEnd, locations }: {
  session: Session; summaries: any[]; overallFairness: number; weekStart: string; weekEnd: string; locations: Location[]
}) {
  const totalPremium = summaries.reduce((s, u) => s + u.premiumShifts, 0)
  const avgPremium = summaries.length ? (totalPremium / summaries.length).toFixed(1) : '0'
  const overtimeStaff = summaries.filter(s => s.overtimeHours > 0)
  const totalOvertimeCost = overtimeStaff.reduce((s, u) => s + u.overtimeHours * 22.5, 0)

  const fairnessColor = overallFairness >= 80 ? 'green' : overallFairness >= 60 ? 'yellow' : 'red'
  const fairnessHex = overallFairness >= 80 ? '#10b981' : overallFairness >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <Box p={32} pb={48}>
      <Box mb={28}>
        <Title order={1} size={24} fw={800}>Analytics</Title>
        <Text size="sm" c="dimmed" mt={4}>Week of {weekStart} — {weekEnd}</Text>
      </Box>

      {/* Top Stats */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} mb={32} spacing="md">
        <Paper p="md" radius="lg" withBorder style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts="0.05em" mb={4}>Fairness Score</Text>
          <Text size="2.5rem" fw={800} c={fairnessColor} lh={1}>{overallFairness}</Text>
          <Text size="xs" c="dimmed" mb={8}>out of 100</Text>
          <Progress value={overallFairness} color={fairnessColor} size="sm" radius="xl" />
        </Paper>
        <Paper p="md" radius="lg" withBorder style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts="0.05em" mb={4}>Staff Scheduled</Text>
          <Text size="2.5rem" fw={800} c="indigo" lh={1}>{summaries.filter(s => s.totalShifts > 0).length}</Text>
          <Text size="xs" c="dimmed">of {summaries.length} total</Text>
        </Paper>
        <Paper p="md" radius="lg" withBorder style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts="0.05em" mb={4}>Overtime Staff</Text>
          <Text size="2.5rem" fw={800} c={overtimeStaff.length > 0 ? 'red' : 'green'} lh={1}>{overtimeStaff.length}</Text>
          <Text size="xs" c="dimmed">≈ ${totalOvertimeCost.toFixed(0)} extra cost</Text>
        </Paper>
        <Paper p="md" radius="lg" withBorder style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts="0.05em" mb={4}>Premium Shifts</Text>
          <Text size="2.5rem" fw={800} c="yellow" lh={1}>{totalPremium}</Text>
          <Text size="xs" c="dimmed">avg {avgPremium}/person</Text>
        </Paper>
      </SimpleGrid>

      {/* Staff Hours Table */}
      <Paper mb={24} radius="lg" withBorder style={{ borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <Group p="md" px={24} justify="space-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Title order={2} size="h4">Staff Hours Distribution</Title>
          <Text size="xs" c="dimmed">Fri/Sat evenings = Premium ⭐</Text>
        </Group>
        <Table.ScrollContainer minWidth={600}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Staff Member</Table.Th>
                <Table.Th>Total Hours</Table.Th>
                <Table.Th>vs Desired</Table.Th>
                <Table.Th>Overtime</Table.Th>
                <Table.Th>Premium Shifts</Table.Th>
                <Table.Th>Fairness</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {summaries.map(s => {
                const barPct = Math.min(100, (s.totalHours / Math.max(s.desiredHours, 1)) * 100)
                const fc = s.fairnessScore >= 80 ? 'green' : s.fairnessScore >= 60 ? 'yellow' : 'red'
                const fhex = s.fairnessScore >= 80 ? '#10b981' : s.fairnessScore >= 60 ? '#f59e0b' : '#ef4444'
                return (
                  <Table.Tr key={s.userId}>
                    <Table.Td>
                      <Group gap={10} align="center" wrap="nowrap">
                        <Avatar size={30} radius="xl"
                          style={{ background: s.avatarColor, color: '#fff', fontSize: 11, fontWeight: 700 }}>
                          {s.avatarInitials}
                        </Avatar>
                        <Text fw={600} size="sm">{s.name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={8} align="center" wrap="nowrap">
                        <Progress value={barPct} color={s.overtimeHours > 0 ? 'red' : 'indigo'} size="sm" radius="xl" style={{ width: 80 }} />
                        <Text size="sm" fw={700}>{s.totalHours}h</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600}
                        c={s.variance > 0 ? 'green' : s.variance < -5 ? 'red' : 'dimmed'}>
                        {s.variance > 0 ? '+' : ''}{s.variance}h
                      </Text>
                      <Text size="xs" c="dimmed">(want {s.desiredHours}h)</Text>
                    </Table.Td>
                    <Table.Td>
                      {s.overtimeHours > 0 ? (
                        <Badge size="sm" color="red" variant="light">{s.overtimeHours}h OT</Badge>
                      ) : (
                        <Text size="sm" c="dimmed">—</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {'⭐'.repeat(Math.min(s.premiumShifts, 5))}
                        {s.premiumShifts > 5 && <Text span size="xs"> +{s.premiumShifts - 5}</Text>}
                        {s.premiumShifts === 0 && <Text span size="sm" c="dimmed">0</Text>}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={8} align="center" wrap="nowrap">
                        <Progress value={s.fairnessScore} color={fc} size="sm" radius="xl" style={{ width: 50 }} />
                        <Text size="xs" fw={700} c={fc}>{s.fairnessScore}</Text>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                )
              })}
              {summaries.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
                    No data for this period
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {/* Location Breakdown */}
      {locations.length > 1 && (
        <Paper p="xl" radius="lg" withBorder style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <Title order={2} size="h4" mb={16}>Locations</Title>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
            {locations.map(loc => (
              <Box key={loc.id} p="md" style={{ background: 'var(--bg-card)', borderRadius: 10, borderLeft: `3px solid ${loc.color}` }}>
                <Text fw={700} size="sm" mb={4}>{loc.shortName}</Text>
                <Text size="xs" c="dimmed">{loc.timezone.split('/')[1]?.replace('_', ' ')}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Paper>
      )}
    </Box>
  )
}
