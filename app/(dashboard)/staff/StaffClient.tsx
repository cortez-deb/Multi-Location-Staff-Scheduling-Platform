'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Box, Group, Stack, Text, Title, TextInput, Select, Badge, Avatar,
  Table, Modal, Button, MultiSelect, Switch, Stepper, PasswordInput
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import type { Session, Location } from '@/lib/types'
import { addUser, updateUser, assignManager, archiveUser } from '@/app/actions/staff'

const SKILL_LABELS: Record<string, string> = {
  bartender: 'Bartender', line_cook: 'Line Cook', server: 'Server',
  host: 'Host', supervisor: 'Supervisor', expo: 'Expo', busser: 'Busser',
}

const SKILL_COLORS: Record<string, string> = {
  bartender: '#a78bfa', line_cook: '#fb923c', server: '#22d3ee',
  host: '#34d399', supervisor: '#fbbf24', expo: '#fb7185', busser: '#94a3b8',
}

const COLORS = ['#a78bfa', '#fb923c', '#22d3ee', '#34d399', '#fbbf24', '#fb7185', '#94a3b8']
const getColor = (str: string) => {
  if (SKILL_COLORS[str]) return SKILL_COLORS[str]
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

const ROLE_COLOR: Record<string, string> = { admin: 'red', manager: 'yellow', staff: 'cyan' }

export function StaffClient({ session, users, locations, weeklyHours, apiLocations, apiSkills }: {
  session: Session; users: any[]; locations: Location[]; weeklyHours: Record<string, number>;
  apiLocations?: any[]; apiSkills?: any[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterLoc, setFilterLoc] = useState<string | null>(null)
  const [filterSkill, setFilterSkill] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [archiveModalUser, setArchiveModalUser] = useState<any | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff' as 'admin' | 'manager' | 'staff',
    skills: [] as string[],
    certifiedLocations: [] as string[],
    isActive: true,
  })

  const locOptions = (apiLocations?.length ? apiLocations : locations).map(l => ({ value: l.id, label: l.name || l.shortName }))
  const skillOptions = apiSkills?.length 
    ? apiSkills.map(s => ({ value: s.id, label: s.name }))
    : Object.entries(SKILL_LABELS).map(([k, v]) => ({ value: k, label: v }))

  const handleOpenAdd = () => {
    setEditingUser(null)
    setActiveStep(0)
    setFormData({ name: '', email: '', password: '', role: 'staff', skills: [], certifiedLocations: [], isActive: true })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (e: React.MouseEvent, u: any) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingUser(u)
    setFormData({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      skills: u.skills || [],
      certifiedLocations: u.certifiedLocations || [],
      isActive: u.isActive,
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.email || formData.certifiedLocations.length === 0) {
      notifications.show({
        title: 'Missing Required Fields',
        message: 'Please provide a name, email, and at least one certified location.',
        color: 'red',
        radius: 'md',
      })
      return
    }

    setIsSaving(true)
    try {
      let res;
      if (editingUser) {
        const updateData = { ...formData }
        if (!updateData.password) delete (updateData as any).password
        res = await updateUser(editingUser.id, updateData as any)
      } else {
        res = await addUser(formData as any)
      }
      
      if (res?.success) {
        notifications.show({
          title: editingUser ? 'User Updated' : 'User Added',
          message: `${formData.name} has been successfully ${editingUser ? 'updated' : 'registered'}.`,
          color: 'green',
          radius: 'md',
        })
        setIsModalOpen(false)
        router.refresh()
      } else {
        notifications.show({
          title: 'Error Saving User',
          message: res?.error || 'Failed to save user',
          color: 'red',
          radius: 'md',
        })
      }
    } catch (err: any) {
      notifications.show({
        title: 'Unexpected Error',
        message: err.message || 'An unexpected error occurred',
        color: 'red',
        radius: 'md',
      })
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

  const nextStep = () => setActiveStep((current) => (current < 2 ? current + 1 : current))
  const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current))

  const passwordReqs = [
    { label: 'At least 8 characters', valid: formData.password.length >= 8 },
    { label: 'Contains a number', valid: /[0-9]/.test(formData.password) },
    { label: 'Contains uppercase letter', valid: /[A-Z]/.test(formData.password) },
    { label: 'Contains lowercase letter', valid: /[a-z]/.test(formData.password) },
    { label: 'Contains special character', valid: /[^A-Za-z0-9]/.test(formData.password) },
  ]
  const isPasswordValid = passwordReqs.every(r => r.valid)

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
            data={locOptions}
            value={filterLoc}
            onChange={setFilterLoc}
            clearable
            style={{ width: 160 }}
          />
          <Select
            placeholder="All Skills"
            data={skillOptions}
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
              <Table.Th>Reports to</Table.Th>
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
                      {user.skills.map((sk: any) => {
                        const apiSkill = apiSkills?.find(s => s.id === sk)
                        const label = apiSkill ? apiSkill.name : (typeof sk === 'string' ? sk.replace('_', ' ') : 'Unknown')
                        const skillSlug = label.toLowerCase().replace(' ', '_')
                        const color = SKILL_COLORS[skillSlug] || getColor(sk)
                        return (
                          <Badge
                            key={sk}
                            size="xs"
                            variant="light"
                            style={{
                              background: `${getColor(label.toLowerCase().replace(' ', '_'))}22`,
                              color: getColor(label.toLowerCase().replace(' ', '_')),
                              border: `1px solid ${getColor(label.toLowerCase().replace(' ', '_'))}44`,
                            }}
                          >
                            {label}
                          </Badge>
                        )
                      })}
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
                    {user.role === 'admin' ? (
                      <Text size="sm" c="dimmed" style={{ paddingLeft: 12 }}>—</Text>
                    ) : user.role === 'manager' ? (
                      <Text size="sm" style={{ paddingLeft: 12 }}>Admin</Text>
                    ) : session.user.role === 'admin' ? (
                      <Select
                        size="xs"
                        variant="unstyled"
                        placeholder="Unassigned"
                        data={[
                          { value: 'null', label: 'Unassigned' },
                          ...users.filter(u => u.role === 'manager').map(m => ({ value: m.id, label: m.name }))
                        ]}
                        value={user.reportsToId || 'null'}
                        onChange={async (val) => {
                          const mId = val === 'null' ? null : val
                          const res = await assignManager(user.id, mId)
                          if (!res.success) {
                            notifications.show({ title: 'Error', message: res.error, color: 'red' })
                          } else {
                            notifications.show({ title: 'Manager Updated', message: `Reporting manager for ${user.name} updated.`, color: 'green' })
                          }
                        }}
                        style={{ width: 140 }}
                        c={!user.reportsToId ? 'dimmed' : undefined}
                      />
                    ) : (
                      <Text size="sm" c={!user.manager ? 'dimmed' : undefined} style={{ paddingLeft: 12 }}>
                        {user.manager ? user.manager.name : 'Unassigned'}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="sm" fw={700} c={isOvertime ? 'red' : isNearOT ? 'yellow' : undefined}>
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
                        <Group gap={8}>
                          <Button size="compact-xs" variant="light" onClick={(e) => handleOpenEdit(e, user)}>Edit</Button>
                          <Button size="compact-xs" variant="light" color="red" onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setArchiveModalUser(user)
                          }}>Delete</Button>
                        </Group>
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

      {/* Archive Confirmation Modal */}
      <Modal opened={!!archiveModalUser} onClose={() => setArchiveModalUser(null)} title={<Text fw={700}>Archive User</Text>} centered radius="md">
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to archive <strong>{archiveModalUser?.name}</strong>?
          </Text>
          <Text size="xs" c="dimmed">
            This will deactivate their account and remove them from active schedules, but their historical data will be preserved.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setArchiveModalUser(null)}>Cancel</Button>
            <Button color="red" loading={isArchiving} onClick={async () => {
              if (!archiveModalUser) return
              setIsArchiving(true)
              const res = await archiveUser(archiveModalUser.id)
              setIsArchiving(false)
              if (res.success) {
                notifications.show({ title: 'User Archived', message: `${archiveModalUser.name} has been deactivated.`, color: 'blue' })
                setArchiveModalUser(null)
              } else {
                notifications.show({ title: 'Error', message: res.error, color: 'red' })
              }
            }}>Archive Staff</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={isModalOpen} onClose={() => setIsModalOpen(false)} title={<Text fw={700}>{editingUser ? 'Edit User' : 'Add User'}</Text>} radius="md" size={editingUser ? 'sm' : 'lg'}>
        {editingUser ? (
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
              data={locOptions}
              value={formData.certifiedLocations}
              onChange={(val) => setFormData({ ...formData, certifiedLocations: val })}
              required
              searchable
            />
            <MultiSelect
              label="Skills"
              data={skillOptions}
              value={formData.skills}
              onChange={(val) => setFormData({ ...formData, skills: val })}
              searchable
            />
            <Switch
              label="Active Employee"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.currentTarget.checked })}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setIsModalOpen(false)} color="gray">Cancel</Button>
              <Button onClick={handleSave} loading={isSaving}>Save Changes</Button>
            </Group>
          </Stack>
        ) : (
          <>
            <Stepper active={activeStep} onStepClick={setActiveStep} mb="xl">
              <Stepper.Step label="Personal Info" description="Basic details">
                <Stack gap="md" mt="md">
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
                </Stack>
              </Stepper.Step>
              <Stepper.Step label="Assignments" description="Role, Skills, Locations">
                <Stack gap="md" mt="md">
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
                    data={locOptions}
                    value={formData.certifiedLocations}
                    onChange={(val) => setFormData({ ...formData, certifiedLocations: val })}
                    required
                    searchable
                  />
                  <MultiSelect
                    label="Skills"
                    data={skillOptions}
                    value={formData.skills}
                    onChange={(val) => setFormData({ ...formData, skills: val })}
                    searchable
                  />
                </Stack>
              </Stepper.Step>
              <Stepper.Step label="Security" description="Password setup">
                <Stack gap="md" mt="md">
                  <PasswordInput
                    label="Temporary Password"
                    placeholder="Enter temporary password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.currentTarget.value })}
                    required
                  />
                  <Stack gap={4}>
                    {passwordReqs.map((req, idx) => (
                      <Group key={idx} gap={8}>
                        <Text c={req.valid ? 'teal' : 'red'} size="sm" style={{ width: 16 }}>
                          {req.valid ? '✓' : '✗'}
                        </Text>
                        <Text size="xs" c={req.valid ? 'dimmed' : 'gray'}>{req.label}</Text>
                      </Group>
                    ))}
                  </Stack>
                </Stack>
              </Stepper.Step>
            </Stepper>

            <Group justify="space-between" mt="xl">
              <Button variant="default" onClick={prevStep} disabled={activeStep === 0}>Back</Button>
              {activeStep < 2 ? (
                <Button onClick={nextStep} disabled={
                  (activeStep === 0 && (!formData.name || !formData.email)) ||
                  (activeStep === 1 && (formData.certifiedLocations.length === 0))
                }>Next step</Button>
              ) : (
                <Button onClick={handleSave} loading={isSaving} disabled={!isPasswordValid}>Save User</Button>
              )}
            </Group>
          </>
        )}
      </Modal>
    </Box>
  )
}
