'use client'
import { DateTime } from 'luxon'
import { Fragment, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box, Group, Stack, Text, Title, Badge, Avatar, Button, Modal,
  Select, Textarea, NumberInput, TextInput, Paper, Divider,
} from '@mantine/core'
import { getShiftUTCTimes } from '@/lib/timezone'
import { ShiftFormModal } from '@/app/components/ShiftFormModal'
import type { Session, Location, Shift } from '@/lib/types'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SKILL_COLORS: Record<string, string> = {
  bartender: '#a78bfa', line_cook: '#fb923c', server: '#22d3ee',
  host: '#34d399', supervisor: '#fbbf24', expo: '#fb7185', busser: '#94a3b8',
}

type StaffInfo = { id: string; name: string; avatarInitials: string; avatarColor: string; skills: string[] }

type Props = {
  session: Session
  shifts: Shift[]
  weekDays: string[]
  weekStart: string
  staffMap: Record<string, StaffInfo>
  locations: Location[]
  selectedLocation: string | null
  today: string
  skills: { id: string, name: string }[]
  leaveRequests: any[]
}

export function ScheduleClient({ session, shifts, weekDays, weekStart, staffMap, locations, selectedLocation, today, skills, leaveRequests }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [selectedDate, setSelectedDate] = useState(today)
  const [editShiftData, setEditShiftData] = useState<Partial<Shift> | null>(null)
  const [dragError, setDragError] = useState<string | null>(null)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showMyLeave, setShowMyLeave] = useState(false)
  const isManager = session.user.role !== 'staff'

  function navigate(dir: 'prev' | 'next') {
    const d = new Date(weekStart + 'T12:00:00Z')
    d.setUTCDate(d.getUTCDate() + (dir === 'next' ? 7 : -7))
    const newWeek = d.toISOString().split('T')[0]
    startTransition(() => {
      router.push(`/schedule?weekOf=${newWeek}${selectedLocation ? `&location=${selectedLocation}` : ''}`)
    })
  }

  function selectLocation(locId: string) {
    startTransition(() => {
      router.push(`/schedule?weekOf=${weekStart}&location=${locId}`)
    })
  }

  async function publishWeek() {
    if (!selectedLocation) return
    const res = await fetch(`/api/shifts/dummy/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'publish', weekOf: weekStart, locationId: selectedLocation }),
    })
    const data = await res.json()
    if (data.success) router.refresh()
  }

  const weekLabel = new Date(weekStart + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const draftCount = shifts.filter(s => s.status === 'draft').length

  return (
    <Box p={32} pb={48} flex={1}>
      {/* Header */}
      <Group align="flex-end" justify="space-between" mb={24} wrap="wrap" gap={12}>
        <Box>
          <Title order={1} size={24} fw={800}>Schedule</Title>
          <Text size="sm" c="dimmed" mt={4}>{weekLabel}</Text>
        </Box>

        <Group gap={8} wrap="wrap">
          <Select
            size="xs"
            placeholder="All Locations"
            data={locations.map(l => ({ value: l.id, label: l.name }))}
            value={selectedLocation}
            onChange={v => selectLocation(v ?? '')}
            clearable
            style={{ width: 180 }}
          />
          <Button size="xs" variant="default" onClick={() => navigate('prev')}>← Prev</Button>
          <Button size="xs" variant="default" onClick={() => startTransition(() =>
            router.push(`/schedule?weekOf=${today}${selectedLocation ? `&location=${selectedLocation}` : ''}`)
          )}>Today</Button>
          <Button size="xs" variant="default" onClick={() => navigate('next')}>Next →</Button>

          {isManager && draftCount > 0 && selectedLocation && (
            <Button size="xs" variant="gradient" gradient={{ from: '#6366f1', to: '#4f46e5' }} onClick={publishWeek}>
              ✓ Publish Week ({draftCount} drafts)
            </Button>
          )}
          {isManager && (
            <Button size="xs" variant="default" onClick={() => { setSelectedDate(today); setShowCreate(true) }}>+ New Shift</Button>
          )}
          {!isManager && (
            <Group gap={8}>
              <Button size="xs" variant="default" onClick={() => setShowMyLeave(true)}>My Requests</Button>
              <Button size="xs" variant="light" color="indigo" onClick={() => setShowLeaveModal(true)}>✈ Request Leave</Button>
            </Group>
          )}
        </Group>
      </Group>

      {/* Grid */}
      <Box style={{ 
        display: 'grid', 
        gridTemplateColumns: `140px repeat(7, 1fr)`,
        background: 'var(--border-subtle)',
        gap: 1,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
      }}>
        {/* Header row */}
        <Box style={{ background: 'var(--bg-card)', padding: '16px 12px' }} />
        {weekDays.map((day, i) => {
          const isToday = day === today
          const d = new Date(day + 'T12:00:00Z')
          return (
            <Box key={day} style={{ background: isToday ? 'var(--bg-today)' : 'var(--bg-card)', padding: '16px 12px', textAlign: 'center' }}>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts="0.05em">{DAYS[i]}</Text>
              <Text size="xl" fw={800} c={isToday ? 'indigo' : 'var(--text-default)'} mt={2}>
                {d.getUTCDate()}
              </Text>
            </Box>
          )
        })}

        {/* Location rows */}
        {(selectedLocation ? locations.filter(l => l.id === selectedLocation) : locations).map(loc => (
          <Fragment key={loc.id}>
            <Box style={{
              background: 'var(--bg-cell)', padding: '12px 8px',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            }}>
              <Text
                size="xs" fw={700} c={loc.color} lts="0.04em"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}
              >
                {loc.shortName}
              </Text>
            </Box>

            {weekDays.map(day => {
              const dayShifts = shifts.filter(s => s.locationId === loc.id && s.date === day)
              const isToday = day === today
              const dayLeave = leaveRequests.find(lr => 
                lr.userId === session.user.id &&
                (lr.status === 'PENDING' || lr.status === 'APPROVED') && 
                day >= lr.startDate && day <= lr.endDate
              )
              
              return (
                <Box key={`${loc.id}-${day}`}
                  onDragOver={(e) => { if (isManager) e.preventDefault() }}
                  onDrop={(e) => {
                    if (!isManager) return
                    e.preventDefault()
                    const shiftId = e.dataTransfer.getData('shiftId')
                    const fromLocation = e.dataTransfer.getData('locationId')
                    if (!shiftId) return
                    if (fromLocation !== loc.id) {
                      setDragError('Cannot drop shift into a different location.')
                      return
                    }
                    if (day < today) {
                      setDragError('Cannot drop shift into a past date.')
                      return
                    }
                    const shiftToEdit = shifts.find(s => s.id === shiftId)
                    if (shiftToEdit) setEditShiftData({ ...shiftToEdit, date: day })
                  }}
                  style={{
                    background: dayLeave?.status === 'APPROVED' ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-cell)',
                    padding: '6px',
                    minHeight: 110,
                    borderLeft: isToday ? '2px solid rgba(99,102,241,0.3)' : undefined,
                    position: 'relative',
                  }}>
                    {dayLeave && (
                      <Box style={{ 
                        position: 'absolute', inset: 0, 
                        background: dayLeave.status === 'APPROVED' ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                        border: dayLeave.status === 'PENDING' ? '1px dashed rgba(99, 102, 241, 0.3)' : undefined,
                        zIndex: 0, pointerEvents: 'none'
                      }}>
                        <Badge size="xs" variant="filled" color={dayLeave.status === 'APPROVED' ? 'red' : 'indigo'} 
                          style={{ position: 'absolute', top: 4, right: 4, opacity: 0.8 }}>
                          {dayLeave.status === 'APPROVED' ? 'On Leave' : 'Leave Pending'}
                        </Badge>
                      </Box>
                    )}
                    
                    <Stack gap={4} style={{ position: 'relative', zIndex: 1 }}>
                      {dayShifts.map(shift => (
                        <ShiftCard key={shift.id} shift={shift} staffMap={staffMap} isManager={isManager} onClick={() => setSelectedShift(shift)} skills={skills} />
                      ))}
                    </Stack>

                  {isManager && (
                    <button
                      className="schedule-add-btn"
                      style={{ marginTop: dayShifts.length > 0 ? 4 : 0 }}
                      onClick={() => { setSelectedDate(day); setShowCreate(true) }}
                    >+ Add</button>
                  )}
                </Box>
              )
            })}
          </Fragment>
        ))}
      </Box>

      {/* Modals */}
      <ShiftDetailModal
        shift={selectedShift}
        staffMap={staffMap}
        location={selectedShift ? locations.find(l => l.id === selectedShift.locationId)! : null}
        session={session}
        skills={skills}
        onClose={() => setSelectedShift(null)}
        onEdit={(s: Shift) => { setSelectedShift(null); setEditShiftData(s) }}
        onUpdate={() => { setSelectedShift(null); router.refresh() }}
      />

      <Modal opened={!!dragError} onClose={() => setDragError(null)} title="Invalid Move" size="sm" radius="md">
        <Text size="sm" mb="md">{dragError}</Text>
        <Group justify="flex-end">
          <Button onClick={() => setDragError(null)}>OK</Button>
        </Group>
      </Modal>

      <LeaveRequestModal
        opened={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onSaved={() => { setShowLeaveModal(false); router.refresh() }}
      />

      <MyLeaveModal
        opened={showMyLeave}
        onClose={() => setShowMyLeave(false)}
        leaveRequests={leaveRequests.filter(lr => lr.userId === session.user.id)}
        onUpdated={() => router.refresh()}
      />

      {(showCreate || !!editShiftData) && (
        <ShiftFormModal
          opened={true}
          locations={locations}
          onClose={() => { setShowCreate(false); setEditShiftData(null) }}
          onSaved={() => { setShowCreate(false); setEditShiftData(null); router.refresh() }}
          defaultDate={selectedDate}
          initialShift={editShiftData}
          skills={skills}
        />
      )}
    </Box>
  )
}

// --- Sub-components ---

function LeaveRequestModal({ opened, onClose, onSaved }: { opened: boolean; onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [skippedDates, setSkippedDates] = useState<string[]>([])
  const [form, setForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: ''
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSkippedDates([])
    
    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.skippedDates) {
          setSkippedDates(data.skippedDates)
          setError(data.message)
        } else {
          throw new Error(data.message || 'Failed to submit request')
        }
        return
      }
      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title={<Text fw={700}>Request Leave</Text>} radius="lg">
      <form onSubmit={submit}>
        <Stack gap="md">
          <Group grow>
            <TextInput label="Start Date" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
            <TextInput label="End Date" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required />
          </Group>
          <Textarea label="Reason" placeholder="Optional notes for your manager..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} maxLength={500} minRows={3} />

          {error && (
            <Box p="sm" style={{ background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>
              <Text size="sm" c="red" fw={600}>{error}</Text>
              {skippedDates.length > 0 && (
                <Stack gap={4} mt={8}>
                  {skippedDates.map(d => <Text key={d} size="xs" c="red">• {d}</Text>)}
                </Stack>
              )}
            </Box>
          )}

          {!error && skippedDates.length > 0 && (
            <Box p="sm" style={{ background: 'rgba(234,179,8,0.1)', borderRadius: 8 }}>
              <Text size="sm" fw={600} c="yellow.9">Notice</Text>
              <Text size="xs" mt={4}>{skippedDates.length} day(s) were excluded (past deadline).</Text>
              <Button fullWidth mt="md" size="xs" variant="light" color="yellow" onClick={onSaved}>Proceed anyway</Button>
            </Box>
          )}

          <Group justify="flex-end" gap={8}>
            <Button variant="default" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" loading={loading} variant="gradient" gradient={{ from: '#6366f1', to: '#4f46e5' }} disabled={skippedDates.length > 0}>Submit</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

function ShiftCard({ shift, staffMap, isManager, onClick, skills }: { shift: Shift; staffMap: Record<string, StaffInfo>; isManager: boolean; onClick: () => void; skills: {id: string, name: string}[] }) {
  const currentSkill = skills.find(s => s.id === shift.requiredSkill)
  const skillLabel = currentSkill?.name || shift.requiredSkill
  const color = SKILL_COLORS[skillLabel.toLowerCase().replace(' ', '_')] ?? '#6366f1'
  const filled = shift.assignedStaff.length
  const pct = Math.round((filled / shift.headcount) * 100)

  return (
    <Box onClick={onClick} draggable={isManager}
      onDragStart={(e) => {
        if (!isManager) return
        e.dataTransfer.setData('shiftId', shift.id)
        e.dataTransfer.setData('locationId', shift.locationId)
      }}
      style={{
        background: `${color}15`, border: `1px solid ${color}30`, borderLeft: `3px solid ${color}`,
        borderRadius: 7, padding: '6px 8px', cursor: 'pointer', transition: 'all 0.15s',
      }}
      onMouseOver={e => (e.currentTarget.style.background = `${color}25`)}
      onMouseOut={e => (e.currentTarget.style.background = `${color}15`)}
    >
      <Group justify="space-between" align="center" gap={4}>
        <Text size="xs" fw={700} tt="uppercase" lts="0.04em" c={color} truncate>{skillLabel}</Text>
        <Text size="10px" fw={700} c={color}>{filled}/{shift.headcount}</Text>
      </Group>
      <Group gap={4} mt={4}>
        <Text size="11px" fw={600} c="var(--text-default)">{shift.startTime}–{shift.endTime}</Text>
        {shift.status === 'draft' && <Badge size="9px" variant="outline" color="gray">DRAFT</Badge>}
      </Group>
    </Box>
  )
}

function ShiftDetailModal({ shift, staffMap, location, session, skills, onClose, onEdit, onUpdate }: {
  shift: Shift | null; staffMap: any; location: Location | null; session: Session; skills: any[]
  onClose: () => void; onEdit: (s: Shift) => void; onUpdate: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  if (!shift) return null

  async function togglePublish() {
    if (!shift) return
    setLoading(true)
    await fetch(`/api/shifts/${shift.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: shift.status !== 'published' })
    })
    setLoading(false)
    onUpdate()
  }

  async function deleteShift() {
    if (!shift) return
    setLoading(true)
    await fetch(`/api/shifts/${shift.id}`, { method: 'DELETE' })
    setLoading(false)
    setShowDeleteConfirm(false)
    onUpdate()
  }

  const isManager = session.user.role !== 'staff'
  const isLocked = new Date() > new Date(new Date(shift.startUtc).getTime() - (shift.editCutoffHours || 48) * 3600000)

  return (
    <>
    <Modal opened={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Confirm Delete" size="sm" radius="md" centered zIndex={3000}>
      <Text size="sm">Are you sure you want to delete this shift? This cannot be undone.</Text>
      <Group justify="flex-end" mt="md"><Button variant="default" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button><Button color="red" onClick={deleteShift} loading={loading}>Delete</Button></Group>
    </Modal>
    <Modal opened={!!shift} onClose={onClose} title={location?.shortName ?? 'Shift Detail'} size="md" radius="lg">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={3} size={20}>{skills.find((s:any) => s.id === shift.requiredSkill)?.name || shift.requiredSkill}</Title>
            <Text size="sm" c="dimmed">{new Date(shift.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          </Box>
          <Badge size="lg" variant="dot" color={shift.status === 'published' ? 'green' : 'gray'}>{shift.status}</Badge>
        </Group>
        <Paper p="md" radius="md" withBorder style={{ background: 'rgba(255,255,255,0.02)' }}>
          <Group grow>
            <Box><Text size="xs" c="dimmed" tt="uppercase" fw={700}>Time</Text><Text fw={600}>{shift.startTime} – {shift.endTime}</Text></Box>
            <Box><Text size="xs" c="dimmed" tt="uppercase" fw={700}>Staffing</Text><Text fw={600}>{shift.assignedStaff.length} / {shift.headcount} filled</Text></Box>
          </Group>
        </Paper>
        <Box>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={8}>Assigned Staff</Text>
          <Stack gap={8}>
            {shift.assignedStaff.map((sid: string) => {
              const u = staffMap[sid]
              return (
                <Group key={sid} gap={10} p={8} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <Avatar size={24} radius="xl" style={{ background: u?.avatarColor }}>{u?.avatarInitials}</Avatar>
                  <Text size="sm" fw={500}>{u?.name || 'Unknown'}</Text>
                </Group>
              )
            })}
            {shift.assignedStaff.length === 0 && <Text size="sm" c="dimmed" fs="italic">No staff assigned yet</Text>}
          </Stack>
        </Box>
        {isLocked && (
          <Box p="xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
            <Text size="xs" c="red" fw={600} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width: 14, height: 14}}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
              Shift is locked (past edit cutoff)
            </Text>
          </Box>
        )}
        {isManager && (
          <Stack gap={8}>
            <Group grow gap={8}>
              <Button variant="default" onClick={() => onEdit(shift)} disabled={isLocked}>Edit Details</Button>
              <Button variant="default" onClick={() => { onClose(); router.push(`/shifts/${shift.id}`) }}>Manage Staff</Button>
            </Group>
            <Group grow gap={8}>
              <Button variant="light" color={shift.status === 'published' ? 'gray' : 'green'} onClick={togglePublish} loading={loading} disabled={isLocked}>
                {shift.status === 'published' ? 'Unpublish' : 'Publish Now'}
              </Button>
              <Button variant="subtle" color="red" onClick={() => setShowDeleteConfirm(true)} disabled={isLocked}>Delete</Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Modal>
    </>
  )
}

function MyLeaveModal({ opened, onClose, leaveRequests, onUpdated }: { opened: boolean; onClose: () => void; leaveRequests: any[]; onUpdated: () => void }) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleCancel = async (id: string) => {
    setLoading(id)
    try {
      await fetch(`/api/leave/${id}/cancel`, { method: 'POST' })
      onUpdated()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title={<Text fw={700}>My Leave Requests</Text>} radius="md" size="md">
      {leaveRequests.length === 0 ? (
        <Text size="sm" c="dimmed" py="xl" ta="center">You haven't requested any leave yet.</Text>
      ) : (
        <Stack gap="md">
          {leaveRequests.map(lr => (
            <Paper key={lr.id} withBorder p="md" radius="md">
              <Group justify="space-between" align="flex-start">
                <Box>
                  <Text fw={700} size="sm">{lr.startDate} – {lr.endDate}</Text>
                  <Text size="xs" c="dimmed" mt={2}>{lr.reason || 'No reason provided'}</Text>
                </Box>
                <Badge color={lr.status === 'APPROVED' ? 'green' : lr.status === 'REJECTED' ? 'red' : lr.status === 'CANCELLED' ? 'gray' : 'blue'}>
                  {lr.status}
                </Badge>
              </Group>
              {lr.status === 'PENDING' && (
                <Group justify="flex-end" mt="md">
                  <Button size="xs" color="red" variant="light" onClick={() => handleCancel(lr.id)} loading={loading === lr.id}>
                    Cancel Request
                  </Button>
                </Group>
              )}
            </Paper>
          ))}
        </Stack>
      )}
    </Modal>
  )
}


