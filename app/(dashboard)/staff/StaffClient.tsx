'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Box, Group, Stack, Text, Title, TextInput, Select, Badge, Avatar,
  Table, Modal, Button, MultiSelect, Switch,
} from '@mantine/core'
import type { Session, Location } from '@/lib/types'
import { addUser, updateUser } from '@/app/actions/staff'

const SKILL_LABELS: Record<string, string> = {
  bartender: 'Bartender', line_cook: 'Line Cook', server: 'Server',
  host: 'Host', supervisor: 'Supervisor', expo: 'Expo', busser: 'Busser',
}

const SKILL_COLORS: Record<string, string> = {
  bartender: '#a78bfa', line_cook: '#fb923c', server: '#22d3ee',
  host: '#34d399', supervisor: '#fbbf24', expo: '#fb7185', busser: '#94a3b8',
}

const ROLE_COLOR: Record<string, string> = { admin: 'red', manager: 'yellow', staff: 'cyan' }

export function StaffClient({ session, users, locations, weeklyHours }: {
  session: Session; users: any[]; locations: Location[]; weeklyHours: Record<string, number>
}) {
  const [search, setSearch] = useState('')
  const [filterLoc, setFilterLoc] = useState<string | null>(null)
  const [filterSkill, setFilterSkill] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'staff' as 'admin' | 'manager' | 'staff',
    skills: [] as string[],
    certifiedLocations: [] as string[],
    isActive: true,
  })

  const handleOpenAdd = () => {
    setEditingUser(null)
    setFormData({ name: '', email: '', role: 'staff', skills: [], certifiedLocations: [], isActive: true })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (e: React.MouseEvent, u: any) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingUser(u)
    setFormData({
      name: u.name,
      email: u.email,
      role: u.role,
      skills: u.skills || [],
      certifiedLocations: u.certifiedLocations || [],
      isActive: u.isActive,
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.email || formData.certifiedLocations.length === 0) return
    setIsSaving(true)
    try {
      if (editingUser) {
        await updateUser(editingUser.id, formData as any)
      } else {
        await addUser(formData as any)
      }
      setIsModalOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  const filtered = users.filter(u => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    if (filterLoc && !u.certifiedLocations.includes(filterLoc)) return false
    if (filterSkill && !u.skills.includes(filterSkill)) return false
    return true
  })

  return (
    <Box p={32} pb={48}>
      {/* Header */}
      <Group align="flex-end" justify="space-between" mb={28} wrap="wrap" gap={12}>
        <Group align="center" gap={16}>
          <Box>
            <Title order={1} size={24} fw={800}>Staff</Title>
            <Text size="sm" c="dimmed" mt={4}>{filtered.length} members</Text>
          </Box>
          {session.user.role === 'admin' && (
            <Button onClick={handleOpenAdd} size="sm" radius="md">Add User</Button>
          )}
        </Group>
        <Group gap={8} wrap="wrap">
          <TextInput
            placeholder="Search name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 200 }}
            autoComplete="off"
            suppressHydrationWarning
          />
          <Select
            placeholder="All Locations"
            data={locations.map(l => ({ value: l.id, label: l.shortName }))}
            value={filterLoc}
            onChange={setFilterLoc}
            clearable
            style={{ width: 160 }}
          />
          <Select
            placeholder="All Skills"
            data={Object.entries(SKILL_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            value={filterSkill}
            onChange={setFilterSkill}
            clearable
            style={{ width: 140 }}
          />
        </Group>
      </Group>

      {/* Staff table */}
      <Table.ScrollContainer minWidth={800}>
        <Table verticalSpacing="sm" striped highlightOnHover className="glass" style={{ borderRadius: 'var(--mantine-radius-lg)', overflow: 'hidden' }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Member</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Skills</Table.Th>
              <Table.Th>Locations</Table.Th>
              <Table.Th>This Week</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map(user => {
              const hours = weeklyHours[user.id] ?? 0
              const isOvertime = hours > 40
              const isNearOT = hours >= 35 && !isOvertime
              const userLocs = locations.filter(l => user.certifiedLocations.includes(l.id))

              return (
                <Table.Tr key={user.id} style={{ opacity: user.isActive ? 1 : 0.6 }}>
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      <Avatar size={40} radius="xl" style={{ background: user.avatarColor, color: '#fff', fontSize: 14, fontWeight: 700 }}>
                        {user.avatarInitials}
                      </Avatar>
                      <Box>
                        <Text fw={700} size="sm" component={Link} href={`/staff/${user.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          {user.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {user.email}
                        </Text>
                      </Box>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Badge size="sm" color={ROLE_COLOR[user.role] ?? 'gray'} variant="light">
                        {user.role}
                      </Badge>
                      {!user.isActive && (
                        <Badge size="sm" color="red" variant="filled">
                          Inactive
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {user.skills.map((sk: string) => (
                        <Badge
                          key={sk}
                          size="xs"
                          variant="light"
                          style={{
                            background: `${SKILL_COLORS[sk]}22`,
                            color: SKILL_COLORS[sk],
                            border: `1px solid ${SKILL_COLORS[sk]}44`,
                          }}
                        >
                          {sk.replace('_', ' ')}
                        </Badge>
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {userLocs.map(l => (
                        <Group key={l.id} gap={4} px={8} py={2} style={{ background: 'var(--bg-hover)', borderRadius: 9999 }}>
                          <Box style={{ width: 6, height: 6, borderRadius: '50%', background: l.color }} />
                          <Text size="xs">{l.shortName}</Text>
                        </Group>
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="sm" fw={700} c={isOvertime ? 'red' : isNearOT ? 'yellow' : 'gray.0'}>
                        {hours}h / {user.desiredHoursPerWeek}h
                        {isOvertime && (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 14, height: 14, marginLeft: 4, display: 'inline-block'}}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2.25m0 4.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                        )}
                        {isNearOT && (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 14, height: 14, marginLeft: 4, display: 'inline-block'}}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2.25m0 4.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                        )}
                      </Text>
                      {session.user.role === 'admin' && (
                        <Button size="compact-xs" variant="light" onClick={(e) => handleOpenEdit(e, user)}>Edit</Button>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              )
            })}
          </Table.Tbody>
        </Table>

        {filtered.length === 0 && (
          <Box style={{ textAlign: 'center', padding: '80px 24px' }} className="glass" mt="md" >
            <Text size="3rem" mb={12} c="dimmed">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 48, height: 48, display: 'inline-block'}}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </Text>
            <Text c="dimmed">No staff match your filters</Text>
          </Box>
        )}
      </Table.ScrollContainer>

      <Modal opened={isModalOpen} onClose={() => setIsModalOpen(false)} title={<Text fw={700}>{editingUser ? 'Edit User' : 'Add User'}</Text>} radius="md">
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
            required
            data-autofocus
          />
          <TextInput
            label="Email"
            placeholder="john@coastaleats.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.currentTarget.value })}
            required
          />
          <Select
            label="Role"
            data={[
              { value: 'staff', label: 'Staff' },
              { value: 'manager', label: 'Manager' },
              { value: 'admin', label: 'Admin' },
            ]}
            value={formData.role}
            onChange={(val) => setFormData({ ...formData, role: (val || 'staff') as any })}
            required
          />
          <MultiSelect
            label="Certified Locations"
            data={locations.map(l => ({ value: l.id, label: l.name }))}
            value={formData.certifiedLocations}
            onChange={(val) => setFormData({ ...formData, certifiedLocations: val })}
            required
            searchable
          />
          <MultiSelect
            label="Skills"
            data={Object.entries(SKILL_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            value={formData.skills}
            onChange={(val) => setFormData({ ...formData, skills: val })}
            searchable
          />
          {editingUser && (
            <Switch
              label="Active Employee"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.currentTarget.checked })}
            />
          )}
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setIsModalOpen(false)} color="gray">Cancel</Button>
            <Button onClick={handleSave} loading={isSaving}>Save User</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  )
}
