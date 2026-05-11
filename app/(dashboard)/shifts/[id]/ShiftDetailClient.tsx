'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Session, Shift, Location, AuditLog } from '@/lib/types'

const SKILL_COLORS: Record<string, string> = {
  bartender: '#a78bfa', line_cook: '#fb923c', server: '#22d3ee',
  host: '#34d399', supervisor: '#fbbf24', expo: '#fb7185', busser: '#94a3b8',
}

import Link from 'next/link'
import { 
  Modal, Button, Group, Stack, Text, Title, Badge, Paper, Box,
  Grid, SimpleGrid, Divider, Alert, Timeline, Progress, Avatar,
  ThemeIcon, TextInput, Container, Tooltip, Flex
} from '@mantine/core'
import { ShiftFormModal } from '@/app/components/ShiftFormModal'

type SafeUser = { id: string; name: string; email: string; skills: string[]; certifiedLocations: string[]; avatarInitials: string; avatarColor: string }

export function ShiftDetailClient({ session, shift, location, locations, allStaff, auditLogs, performerMap, apiSkills }: {
  session: Session; shift: Shift; location: Location; locations: Location[]
  allStaff: SafeUser[]; auditLogs: AuditLog[]; performerMap: Record<string, string>
  apiSkills?: { id: string, name: string }[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [violations, setViolations] = useState<any[]>([])
  const [warnings, setWarnings] = useState<any[]>([])
  const [overrideReason, setOverrideReason] = useState('')
  const [pendingAssign, setPendingAssign] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false)
  const isManager = session.user.role !== 'staff'
  const isFull = shift.assignedStaff.length >= shift.headcount
  const isLocked = new Date() > new Date(new Date(shift.startUtc).getTime() - (shift.editCutoffHours || 48) * 3600000)

  useEffect(() => {
    if (!isManager || isLocked || isFull) return

    const timer = setTimeout(async () => {
      setFetchingSuggestions(true)
      try {
        const res = await fetch(`/api/shifts/${shift.id}/eligible?search=${encodeURIComponent(search)}`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data)
        }
      } finally {
        setFetchingSuggestions(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [search, isLocked, isFull, shift.id, isManager])

  async function assign(staffId: string, override?: string) {
    setLoading(true); setViolations([]); setWarnings([]); setMsg('')
    const res = await fetch(`/api/shifts/${shift.id}/assignments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: staffId, overrideReason: override }),
    })
    const d = await res.json()
    setLoading(false)
    
    if (res.ok) { 
      router.refresh(); 
      setPendingAssign(null);
      if (d.warnings && d.warnings.length > 0) {
        setWarnings(d.warnings);
      }
    } else if (res.status === 422) {
      if (d.requiresOverride) {
        setPendingAssign(staffId);
      }
      setViolations(d.violations ?? []);
      setWarnings(d.warnings ?? []);
    } else {
      setMsg(d.message || d.error || 'Failed to assign');
    }
  }

  async function unassign(staffId: string) {
    setLoading(true)
    await fetch(`/api/shifts/${shift.id}/assignments/${staffId}`, {
      method: 'DELETE'
    })
    setLoading(false); router.refresh()
  }

  async function togglePublish() {
    setLoading(true)
    await fetch(`/api/shifts/${shift.id}/publish`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: shift.status === 'published' ? 'unpublish' : 'publish' }),
    })
    setLoading(false); router.refresh()
  }

  async function deleteShift() {
    setLoading(true)
    const res = await fetch(`/api/shifts/${shift.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/shifts')
    } else {
      setLoading(false)
      setMsg('Failed to delete shift')
    }
  }



  const currentSkill = apiSkills?.find(s => s.id === shift.requiredSkill)
  const skillLabel = currentSkill?.name || shift.requiredSkill
  const skillSlug = (currentSkill?.name || shift.requiredSkill || 'staff').toLowerCase().replace(' ', '_')

  return (
    <Box p={{ base: 16, sm: 32 }} pb={60} maw={1100} mx="auto">
      <Modal opened={showDelete} onClose={() => setShowDelete(false)} title={<Text fw={700}>Confirm Delete</Text>} size="sm" radius="md" centered>
        <Stack gap="md">
          <Text size="sm">Are you sure you want to delete this shift? This action cannot be undone and will notify all assigned staff.</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button color="red" onClick={deleteShift} loading={loading}>Delete Shift</Button>
          </Group>
        </Stack>
      </Modal>

      <ShiftFormModal
        opened={showEdit}
        onClose={() => setShowEdit(false)}
        onSaved={() => { setShowEdit(false); router.refresh() }}
        locations={locations}
        initialShift={shift}
        skills={apiSkills}
      />

      {/* Navigation */}
      <Button 
        component={Link} 
        href="/shifts" 
        variant="subtle" 
        color="gray" 
        leftSection={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width: 14, height: 14}}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>}
        size="xs"
        mb={20}
        px={0}
      >
        Back to Shifts
      </Button>

      {/* Main Grid */}
      <Stack gap={24}>
        {/* Top Header Card */}
        <Paper p={{ base: 20, sm: 32 }} radius="lg" withBorder className="glass" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <Stack gap={24}>
              <Group justify="space-between" align="flex-start" wrap="wrap" gap={20}>
                <Box style={{ flex: 1, minWidth: 280 }}>
                <Group gap={8} mb={16}>
                  <Badge 
                    color={SKILL_COLORS[skillSlug] ?? 'indigo'} 
                    variant="filled" 
                    radius="sm" 
                    size="md"
                    style={{ textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}
                  >
                    {skillLabel}
                  </Badge>
                  <Badge 
                    color={shift.status === 'published' ? 'green' : 'gray'} 
                    variant="light" 
                    size="md"
                  >
                    {shift.status === 'published' ? '● Published' : '○ Draft'}
                  </Badge>
                  {shift.isPremium && <Badge color="orange" variant="light" size="md">⭐ Premium</Badge>}
                  {isLocked && (
                    <Badge color="red" variant="filled" size="md" leftSection={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width: 12, height: 12}}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>}>
                      Locked
                    </Badge>
                  )}
                </Group>

                <Title order={1} size={32} fw={900} lts="-0.03em">{location.shortName}</Title>
                
                <Group gap={16} mt={8} wrap="wrap">
                  <Group gap={6}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 18, height: 18, color: 'var(--mantine-color-dimmed)'}}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                    <Text size="sm" fw={600}>{shift.date}</Text>
                  </Group>
                  <Group gap={6}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 18, height: 18, color: 'var(--mantine-color-dimmed)'}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                    <Text size="sm" fw={600}>{shift.startTime} – {shift.endTime}</Text>
                  </Group>
                  <Group gap={6}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 18, height: 18, color: 'var(--mantine-color-dimmed)'}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-.778.099-1.533.284-2.253" /></svg>
                    <Text size="xs" c="dimmed">{location.timezone}</Text>
                  </Group>
                </Group>
              </Box>

              {isManager && (
                <Stack w={{ base: '100%', sm: 'auto' }} style={{ minWidth: 220 }}>
                  <Flex direction="column" gap={10} align={{ base: 'stretch', sm: 'flex-end' }}>
                    {isLocked && <Text size="xs" c="red" fw={700} ta={{ base: 'center', sm: 'right' }}>Locked for editing</Text>}
                    <Group gap={8} wrap="nowrap" w="100%">
                      <Button variant="default" onClick={() => setShowEdit(true)} disabled={isLocked} flex={1}>Edit</Button>
                      <Button 
                        variant="light" 
                        color={shift.status === 'published' ? 'gray' : 'green'} 
                        onClick={togglePublish} 
                        loading={loading} 
                        disabled={isLocked}
                        flex={1.5}
                      >
                        {shift.status === 'published' ? 'Unpublish' : 'Publish'}
                      </Button>
                    </Group>
                    <Button variant="subtle" color="red" size="xs" onClick={() => setShowDelete(true)} disabled={isLocked} fullWidth>
                      Delete Shift
                    </Button>
                  </Flex>
                </Stack>
              )}
              </Group>

              {shift.notes && (
                <Paper p="md" radius="md" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4} lts="0.05em">Manager Notes</Text>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{shift.notes}</Text>
                </Paper>
              )}
            </Stack>

          <Divider my={24} style={{ opacity: 0.1 }} />

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={32}>
            <Box>
              <Group justify="space-between" mb={8}>
                <Text size="xs" fw={700} tt="uppercase" c="dimmed" lts="0.05em">Headcount</Text>
                <Text size="sm" fw={800} c={isFull ? 'green' : undefined}>{shift.assignedStaff.length} / {shift.headcount}</Text>
              </Group>
              <Progress value={(shift.assignedStaff.length / shift.headcount) * 100} color={isFull ? 'green' : 'indigo'} size="sm" radius="xl" />
            </Box>

            <Box>
              <Text size="xs" fw={700} tt="uppercase" c="dimmed" lts="0.05em" mb={4}>Edit Cutoff</Text>
              <Group gap={8}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 16, height: 16, color: 'var(--mantine-color-orange-filled)'}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                <Text size="sm" fw={700}>{shift.editCutoffHours ? `${shift.editCutoffHours}h before start` : 'No cutoff set'}</Text>
              </Group>
            </Box>

            <Box>
              <Text size="xs" fw={700} tt="uppercase" c="dimmed" lts="0.05em" mb={4}>Created By</Text>
              <Group gap={8}>
                <Avatar size={20} radius="xl" color="indigo" variant="filled">
                  {(performerMap[shift.createdBy] || shift.createdBy || '?').charAt(0)}
                </Avatar>
                <Text size="sm" fw={700}>{performerMap[shift.createdBy] ?? shift.createdBy}</Text>
              </Group>
            </Box>
          </SimpleGrid>
        </Paper>

        <Grid>
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Paper p="xl" radius="lg" withBorder style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.01)' }}>
              <Group justify="space-between" mb={20}>
                <Title order={3} size={18} fw={800}>Assigned Staff</Title>
                <Badge variant="light" size="sm">{shift.assignedStaff.length} members</Badge>
              </Group>
              
              {shift.assignedStaff.length === 0 ? (
                <Box py={40} ta="center">
                  <Text size="sm" c="dimmed">No staff assigned to this shift yet.</Text>
                </Box>
              ) : (
                <Stack gap={12}>
                  {shift.assignedStaff.map(sid => {
                    const s = allStaff.find(u => u.id === sid)
                    if (!s) return null
                    return (
                      <Paper key={sid} p="sm" radius="md" withBorder style={{ background: 'var(--bg-card)', borderColor: 'rgba(255,255,255,0.05)' }}>
                        <Group gap={12} wrap="nowrap">
                          <Avatar size={36} radius="xl" style={{ background: s.avatarColor, color: '#fff', fontSize: 12, fontWeight: 700 }}>
                            {s.avatarInitials}
                          </Avatar>
                          <Box style={{ flex: 1 }}>
                            <Text size="sm" fw={700}>{s.name}</Text>
                            <Group gap={4} mt={2}>
                              {s.skills.slice(0, 2).map(sk => {
                                const sObj = apiSkills?.find(apiS => apiS.id === sk)
                                const sLabel = sObj?.name || sk
                                return (
                                  <Badge key={sk} size="xs" variant="outline" style={{ fontSize: 9, height: 16 }}>{sLabel}</Badge>
                                )
                              })}
                              {s.skills.length > 2 && <Text size="10px" c="dimmed">+{s.skills.length - 2} more</Text>}
                            </Group>
                          </Box>
                          {isManager && (
                            <Button 
                              size="compact-xs" 
                              variant="subtle" 
                              color="red" 
                              onClick={() => unassign(sid)} 
                              disabled={loading || isLocked}
                            >
                              Unassign
                            </Button>
                          )}
                        </Group>
                      </Paper>
                    )
                  })}
                </Stack>
              )}
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 7 }}>
            <Paper p="xl" radius="lg" withBorder style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <Title order={3} size={18} fw={800} mb={20}>
                {isLocked ? 'Staffing Summary' : 'Add Qualified Staff'}
              </Title>

              {!isLocked && !isFull ? (
                <Stack gap={16}>
                  <Box pos="relative">
                    <TextInput 
                      placeholder="Search by name or email..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      leftSection={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>}
                      radius="md"
                    />
                  </Box>

                  <Text size="xs" c="dimmed" fw={600}>
                    {fetchingSuggestions ? 'Searching qualified staff...' : `Found ${suggestions.length} eligible members (${skillLabel})`}
                  </Text>

                  {/* Violation messages */}
                  {violations.map((v, i) => (
                    <Alert key={i} color="red" radius="md" title="Constraint Violation" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width: 20, height: 20}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>}>
                      <Text size="sm" fw={700}>{v.message}</Text>
                      {v.suggestions?.length > 0 && (
                        <Text size="xs" mt={4} c="green" fw={600}>
                          Suggested: {v.suggestions.map((s: any) => s.name).join(', ')}
                        </Text>
                      )}
                    </Alert>
                  ))}

                  {/* Override form */}
                  {pendingAssign && (
                    <Paper p="md" radius="md" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <Text size="sm" fw={700} c="red" mb={8}>Documented Reason Required</Text>
                      <TextInput 
                        placeholder="Why is this assignment necessary?" 
                        value={overrideReason} 
                        onChange={e => setOverrideReason(e.currentTarget.value)} 
                        mb={12}
                        radius="md"
                      />
                      <Group gap={8}>
                        <Button color="red" size="xs" onClick={() => assign(pendingAssign, overrideReason)} disabled={!overrideReason || loading}>
                          Confirm Override
                        </Button>
                        <Button variant="subtle" color="gray" size="xs" onClick={() => { setPendingAssign(null); setViolations([]) }}>Cancel</Button>
                      </Group>
                    </Paper>
                  )}

                  <Stack gap={8} style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {suggestions.map(s => (
                      <Paper key={s.id} p="sm" radius="md" withBorder style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.05)' }}>
                        <Group gap={12} wrap="nowrap">
                          <Avatar size={32} radius="xl" style={{ background: s.avatarColor, color: '#fff', fontSize: 11, fontWeight: 700 }}>
                            {s.avatarInitials}
                          </Avatar>
                          <Box style={{ flex: 1 }}>
                            <Text size="sm" fw={700}>{s.name}</Text>
                            <Text size="xs" c="dimmed">{s.email}</Text>
                          </Box>
                          <Button size="compact-xs" variant="filled" onClick={() => assign(s.id)} disabled={loading}>Assign</Button>
                        </Group>
                      </Paper>
                    ))}
                    {suggestions.length === 0 && !fetchingSuggestions && !search && (
                      <Box py={20} style={{ textAlign: 'center' }}>
                        <Text size="xs" c="dimmed">Search for more certified staff members.</Text>
                      </Box>
                    )}
                  </Stack>
                </Stack>
              ) : isFull ? (
                <Box py={40} ta="center">
                  <ThemeIcon size={40} radius="xl" color="green" variant="light" mb={12}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width: 20, height: 20}}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  </ThemeIcon>
                  <Text size="sm" fw={700}>Shift Fully Staffed</Text>
                  <Text size="xs" c="dimmed">All {shift.headcount} positions have been filled.</Text>
                </Box>
              ) : (
                <Box py={40} ta="center">
                  <Text size="sm" c="red" fw={700}>Shift is Locked</Text>
                  <Text size="xs" c="dimmed">The edit cutoff has passed. No further assignments can be made.</Text>
                </Box>
              )}
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Audit Trail Timeline */}
        {auditLogs.length > 0 && (
          <Paper p="xl" radius="lg" withBorder style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <Title order={3} size={18} fw={800} mb={24}>Activity History</Title>
            <Timeline active={auditLogs.length} bulletSize={12} lineWidth={2}>
              {auditLogs.map((log) => (
                <Timeline.Item 
                  key={log.id} 
                  title={
                    <Group gap={8}>
                      <Text size="sm" fw={800}>{performerMap[log.actorId] ?? log.actorId}</Text>
                      <Text size="xs" c="dimmed" tt="lowercase">{(log.action || '').replace('_', ' ')}</Text>
                    </Group>
                  }
                >
                  <Box mt={4}>
                    {(log.after as any)?.staffId && (
                      <Text size="xs" c="indigo" fw={700}>
                        Target: {performerMap[(log.after as any)?.staffId] ?? (log.after as any)?.staffId}
                      </Text>
                    )}
                    {(log.after as any)?.overrideReason && (
                      <Badge size="xs" color="orange" variant="light" mt={4}>
                        Override: {(log.after as any).overrideReason}
                      </Badge>
                    )}
                    <Text size="xs" c="dimmed" mt={4}>
                      {new Date(log.createdAt).toLocaleString()}
                    </Text>
                  </Box>
                </Timeline.Item>
              ))}
            </Timeline>
          </Paper>
        )}
      </Stack>
      {msg && (
        <Alert color="red" radius="md" mt="xl" title="Error">
          {msg}
        </Alert>
      )}
    </Box>
  )
}
