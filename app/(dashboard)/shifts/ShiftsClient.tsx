'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Box, Group, Stack, Text, Title, Badge, Avatar, Button, Select, TextInput,
  Table, ActionIcon, Anchor,
} from '@mantine/core'
import type { Session, Shift, Location } from '@/lib/types'

const SKILL_COLORS: Record<string, string> = {
  bartender: '#a78bfa', line_cook: '#fb923c', server: '#22d3ee',
  host: '#34d399', supervisor: '#fbbf24', expo: '#fb7185', busser: '#94a3b8',
}

const STATUS_COLOR: Record<string, string> = { published: 'green', draft: 'gray' }

export function ShiftsClient({ session, shifts, staffMap, locations }: {
  session: Session; shifts: Shift[]
  staffMap: Record<string, { id: string; name: string; avatarInitials: string; avatarColor: string }>
  locations: Location[]
}) {
  const router = useRouter()
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [filterLocation, setFilterLocation] = useState<string | null>(null)
  const [filterSkill, setFilterSkill] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const isManager = session.user.role !== 'staff'

  const filtered = shifts.filter(s => {
    if (filterStatus && s.status !== filterStatus) return false
    if (filterLocation && s.locationId !== filterLocation) return false
    if (filterSkill && s.requiredSkill !== filterSkill) return false
    if (search) {
      const loc = locations.find(l => l.id === s.locationId)
      const text = `${s.date} ${s.requiredSkill} ${loc?.shortName ?? ''}`.toLowerCase()
      if (!text.includes(search.toLowerCase())) return false
    }
    return true
  })

  const today = new Date().toISOString().split('T')[0]
  const upcoming = filtered.filter(s => s.date >= today)
  const past = filtered.filter(s => s.date < today)

  function ShiftTable({ items }: { items: Shift[] }) {
    return (
      <Table.ScrollContainer minWidth={600}>
        <Table striped={false} highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date & Time</Table.Th>
              <Table.Th>Location</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Staff</Table.Th>
              <Table.Th>Status</Table.Th>
              {isManager && <Table.Th>Actions</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map(shift => {
              const loc = locations.find(l => l.id === shift.locationId)
              const color = SKILL_COLORS[shift.requiredSkill] ?? '#6366f1'
              return (
                <Table.Tr
                  key={shift.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/shifts/${shift.id}`)}
                >
                  <Table.Td>
                    <Text fw={600} size="sm">{shift.date}</Text>
                    <Text size="xs" c="dimmed">
                      {shift.startTime} – {shift.endTime} {shift.isOvernight && '🌙'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={8} align="center" wrap="nowrap">
                      <Box style={{ width: 8, height: 8, borderRadius: '50%', background: loc?.color ?? '#6366f1', flexShrink: 0 }} />
                      <Text size="sm">{loc?.shortName ?? shift.locationId}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      <Badge size="sm" variant="light"
                        style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
                        {shift.requiredSkill.replace('_', ' ')}
                      </Badge>
                      {shift.isPremium && <Text size="sm">⭐</Text>}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} align="center" wrap="nowrap">
                      <Group gap={0}>
                        {shift.assignedStaff.slice(0, 3).map(sid => {
                          const s = staffMap[sid]
                          return s ? (
                            <Avatar key={sid} title={s.name} size={24} radius="xl"
                              style={{ background: s.avatarColor, color: '#fff', fontSize: 9, fontWeight: 700, marginLeft: -6, border: '2px solid var(--bg-cell)' }}>
                              {s.avatarInitials}
                            </Avatar>
                          ) : null
                        })}
                      </Group>
                      <Text size="xs"
                        c={shift.assignedStaff.length >= shift.headcount ? 'green' : 'dimmed'}
                        ml={8}
                      >
                        {shift.assignedStaff.length}/{shift.headcount}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" color={STATUS_COLOR[shift.status] ?? 'gray'} variant="light">
                      {shift.status}
                    </Badge>
                  </Table.Td>
                  {isManager && (
                    <Table.Td onClick={e => e.stopPropagation()}>
                      <Anchor component={Link} href={`/shifts/${shift.id}`} size="sm" c="indigo">
                        Manage →
                      </Anchor>
                    </Table.Td>
                  )}
                </Table.Tr>
              )
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    )
  }

  return (
    <Box p={32} pb={48}>
      {/* Header */}
      <Group align="flex-end" justify="space-between" mb={28} wrap="wrap" gap={12}>
        <Box>
          <Title order={1} size={24} fw={800}>Shifts</Title>
          <Text size="sm" c="dimmed" mt={4}>{filtered.length} shifts</Text>
        </Box>
        <Group gap={8} wrap="wrap">
          <TextInput placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
          <Select
            placeholder="All Status"
            data={[{ value: 'published', label: 'Published' }, { value: 'draft', label: 'Draft' }]}
            value={filterStatus}
            onChange={setFilterStatus}
            clearable
            style={{ width: 130 }}
          />
          <Select
            placeholder="All Locations"
            data={locations.map(l => ({ value: l.id, label: l.shortName }))}
            value={filterLocation}
            onChange={setFilterLocation}
            clearable
            style={{ width: 160 }}
          />
          <Select
            placeholder="All Skills"
            data={['bartender', 'line_cook', 'server', 'host', 'supervisor', 'expo', 'busser'].map(s => ({
              value: s, label: s.replace('_', ' '),
            }))}
            value={filterSkill}
            onChange={setFilterSkill}
            clearable
            style={{ width: 140 }}
          />
        </Group>
      </Group>

      {[{ label: 'Upcoming & Today', items: upcoming }, { label: 'Past', items: past }].map(({ label, items }) =>
        items.length > 0 && (
          <Box key={label} mb={32}>
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts="0.06em" mb={12}>
              {label} ({items.length})
            </Text>
            <Box style={{ background: 'var(--bg-cell)', border: '1px solid var(--border-light)', borderRadius: 12, overflow: 'hidden' }}>
              <ShiftTable items={items} />
            </Box>
          </Box>
        )
      )}

      {filtered.length === 0 && (
        <Box style={{ textAlign: 'center', padding: '80px 24px' }}>
          <Text size="3rem" mb={12} c="dimmed">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 48, height: 48, display: 'inline-block'}}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </Text>
          <Text c="dimmed">No shifts match your filters</Text>
        </Box>
      )}
    </Box>
  )
}
