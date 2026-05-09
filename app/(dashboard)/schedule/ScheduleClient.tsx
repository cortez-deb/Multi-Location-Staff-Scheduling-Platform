'use client'
import { Fragment, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box, Group, Stack, Text, Title, Badge, Avatar, Button, Modal,
  Select, Textarea, NumberInput, TextInput, Paper, Divider,
} from '@mantine/core'
import type { Session, Location, Shift } from '@/lib/types'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SKILL_COLORS: Record<string, string> = {
  bartender: '#a78bfa', line_cook: '#fb923c', server: '#22d3ee',
  host: '#34d399', supervisor: '#fbbf24', expo: '#fb7185', busser: '#94a3b8',
}
const SKILLS = ['bartender', 'line_cook', 'server', 'host', 'supervisor', 'expo', 'busser']

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
}

export function ScheduleClient({ session, shifts, weekDays, weekStart, staffMap, locations, selectedLocation, today }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [editShiftData, setEditShiftData] = useState<Partial<Shift> | null>(null)
  const [dragError, setDragError] = useState<string | null>(null)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const isManager = session.role !== 'staff'

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
          {/* Week nav */}
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
            <Button size="xs" variant="default" onClick={() => setShowCreate(true)}>+ New Shift</Button>
          )}
        </Group>
      </Group>

      {/* Location tabs */}
      {locations.length > 1 && (
        <Group gap={8} mb={20} wrap="wrap">
          <Button
            size="xs"
            variant={!selectedLocation ? 'filled' : 'subtle'}
            color="indigo"
            onClick={() => startTransition(() => router.push(`/schedule?weekOf=${weekStart}`))}
          >All Locations</Button>
          {locations.map(loc => (
            <Button
              key={loc.id}
              size="xs"
              variant={selectedLocation === loc.id ? 'filled' : 'subtle'}
              color="indigo"
              onClick={() => selectLocation(loc.id)}
              style={selectedLocation !== loc.id ? { borderLeft: `3px solid ${loc.color}` } : {}}
            >{loc.shortName}</Button>
          ))}
        </Group>
      )}

      {/* Calendar Grid */}
      <Box
        style={{
          display: 'grid',
          gridTemplateColumns: '72px repeat(7, 1fr)',
          gap: 1,
          background: 'var(--border-subtle)',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid var(--border-light)',
        }}
      >
        {/* Header row */}
        <Box style={{ background: 'var(--bg-card)', padding: '10px 8px' }} />
        {weekDays.map((day, i) => {
          const d = new Date(day + 'T12:00:00Z')
          const isToday = day === today
          return (
            <Box key={day} style={{
              background: 'var(--bg-card)',
              padding: '10px 8px',
              textAlign: 'center',
              borderLeft: isToday ? '2px solid #6366f1' : undefined,
            }}>
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
            {/* Location label */}
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

            {/* Day cells */}
            {weekDays.map(day => {
              const dayShifts = shifts.filter(s => s.locationId === loc.id && s.date === day)
              const isToday = day === today
              return (
                <Box key={`${loc.id}-${day}`}
                  onDragOver={(e) => {
                    if (!isManager) return
                    e.preventDefault() // Allow drop
                  }}
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
                    if (shiftToEdit) {
                      setEditShiftData({ ...shiftToEdit, date: day })
                    }
                  }}
                  style={{
                  background: 'var(--bg-cell)',
                  padding: '6px',
                  minHeight: 90,
                  borderLeft: isToday ? '2px solid rgba(99,102,241,0.3)' : undefined,
                }}>
                  {dayShifts.map(shift => (
                    <ShiftCard key={shift.id} shift={shift} staffMap={staffMap} isManager={isManager} onClick={() => setSelectedShift(shift)} />
                  ))}
                  {isManager && (
                    <button
                      className="schedule-add-btn"
                      style={{ marginTop: dayShifts.length > 0 ? 4 : 0 }}
                      onClick={() => setShowCreate(true)}
                    >+ Add</button>
                  )}
                </Box>
              )
            })}
          </Fragment>
        ))}
      </Box>

      {/* Shift Detail Modal */}
      <ShiftDetailModal
        shift={selectedShift}
        staffMap={staffMap}
        location={selectedShift ? locations.find(l => l.id === selectedShift.locationId)! : null}
        session={session}
        onClose={() => setSelectedShift(null)}
        onUpdate={() => { setSelectedShift(null); router.refresh() }}
      />

      {/* Drag Error Modal */}
      <Modal opened={!!dragError} onClose={() => setDragError(null)} title="Invalid Move" size="sm" radius="md">
        <Text size="sm" mb="md">{dragError}</Text>
        <Group justify="flex-end">
          <Button onClick={() => setDragError(null)}>OK</Button>
        </Group>
      </Modal>

      {/* Shift Form Modal (Create or Edit) */}
      {(showCreate || !!editShiftData) && (
        <ShiftFormModal
          opened={true}
          locations={locations.filter(l =>
            session.role === 'admin' ? true : session.managedLocations.includes(l.id)
          )}
          onClose={() => { setShowCreate(false); setEditShiftData(null) }}
          onSaved={() => { setShowCreate(false); setEditShiftData(null); router.refresh() }}
          defaultDate={today}
          initialShift={editShiftData}
        />
      )}
    </Box>
  )
}

function ShiftCard({ shift, staffMap, isManager, onClick }: { shift: Shift; staffMap: Record<string, StaffInfo>; isManager: boolean; onClick: () => void }) {
  const color = SKILL_COLORS[shift.requiredSkill] ?? '#6366f1'
  const filled = shift.assignedStaff.length
  const pct = Math.round((filled / shift.headcount) * 100)

  return (
    <Box
      onClick={onClick}
      draggable={isManager}
      onDragStart={(e) => {
        if (!isManager) return
        e.dataTransfer.setData('shiftId', shift.id)
        e.dataTransfer.setData('locationId', shift.locationId)
        e.dataTransfer.effectAllowed = 'move'
      }}
      style={{
        background: `${color}15`,
        border: `1px solid ${color}30`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 7, padding: '6px 8px', marginBottom: 4, cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseOver={e => (e.currentTarget.style.background = `${color}25`)}
      onMouseOut={e => (e.currentTarget.style.background = `${color}15`)}
    >
      <Group justify="space-between" align="center" gap={4}>
        <Text size="xs" fw={700} tt="uppercase" lts="0.04em" c={color}>
          {shift.requiredSkill.replace('_', ' ')}
        </Text>
        <Group gap={4}>
          {shift.isPremium && <Text size="xs">⭐</Text>}
          {shift.status === 'draft' && (
            <Text size="xs" style={{ background: 'var(--bg-draft)', color: '#94a3b8', padding: '1px 4px', borderRadius: 3 }}>
              DRAFT
            </Text>
          )}
        </Group>
      </Group>
      <Text size="xs" c="dimmed" mt={2}>{shift.startTime}–{shift.endTime}</Text>
      <Group gap={4} mt={4} align="center">
        <Box flex={1} style={{ height: 3, background: 'var(--bg-progress)', borderRadius: 2 }}>
          <Box style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: filled >= shift.headcount ? '#10b981' : color, borderRadius: 2 }} />
        </Box>
        <Text size="xs" c={filled >= shift.headcount ? 'green' : 'dimmed'} fw={600}>
          {filled}/{shift.headcount}
        </Text>
      </Group>
    </Box>
  )
}

function ShiftDetailModal({ shift, staffMap, location, session, onClose, onUpdate }: {
  shift: Shift | null; staffMap: Record<string, StaffInfo>; location: Location | null; session: Session; onClose: () => void; onUpdate: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const isManager = session.role !== 'staff'

  async function publish() {
    if (!shift) return
    setLoading(true)
    const res = await fetch(`/api/shifts/${shift.id}/publish`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: shift.status === 'published' ? 'unpublish' : 'publish' }),
    })
    const d = await res.json()
    setLoading(false)
    if (d.success) onUpdate()
    else setMsg(d.error)
  }

  async function deleteShift() {
    if (!shift || !confirm('Delete this shift?')) return
    setLoading(true)
    await fetch(`/api/shifts/${shift.id}`, { method: 'DELETE' })
    setLoading(false)
    onUpdate()
  }

  return (
    <Modal opened={!!shift} onClose={onClose} title={location?.shortName ?? 'Shift Detail'} size="md" radius="lg">
      {shift && (
        <Stack gap="md">
          <Group gap={8} wrap="wrap">
            <Badge size="sm" variant="light"
              style={{ background: `${SKILL_COLORS[shift.requiredSkill] ?? '#6366f1'}22`, color: SKILL_COLORS[shift.requiredSkill] ?? '#6366f1' }}>
              {shift.requiredSkill.replace('_', ' ')}
            </Badge>
            <Badge size="sm" color={shift.status === 'published' ? 'green' : 'gray'} variant="light">{shift.status}</Badge>
            {shift.isPremium && <Badge size="sm" color="yellow" variant="light">⭐ Premium</Badge>}
          </Group>

          <Text size="sm" c="dimmed">
            {shift.date} · {shift.startTime} – {shift.endTime}
            {shift.isOvernight && ' (overnight)'}
          </Text>

          <Group justify="space-between">
            <Text size="sm" c="dimmed">Headcount</Text>
            <Text size="sm" fw={700}>{shift.assignedStaff.length} / {shift.headcount}</Text>
          </Group>

          <Divider color="var(--border-subtle)" />

          <Box>
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts="0.08em" mb={8}>Assigned Staff</Text>
            {shift.assignedStaff.length === 0 ? (
              <Text size="sm" c="dimmed">No staff assigned yet</Text>
            ) : (
              <Stack gap={6}>
                {shift.assignedStaff.map(sid => {
                  const s = staffMap[sid]
                  if (!s) return null
                  return (
                    <Group key={sid} gap={10} align="center" p="xs"
                      style={{ background: 'var(--bg-card)', borderRadius: 8 }}>
                      <Avatar size={36} radius="xl" style={{ background: s.avatarColor, color: '#fff', fontSize: 11, fontWeight: 700 }}>
                        {s.avatarInitials}
                      </Avatar>
                      <Text size="sm" fw={600} flex={1}>{s.name}</Text>
                      <Group gap={4}>
                        {s.skills.map(sk => (
                          <Badge key={sk} size="xs" variant="light"
                            style={{ background: `${SKILL_COLORS[sk]}22`, color: SKILL_COLORS[sk] }}>
                            {sk.replace('_', ' ')}
                          </Badge>
                        ))}
                      </Group>
                    </Group>
                  )
                })}
              </Stack>
            )}
          </Box>

          {msg && (
            <Text size="sm" c="red" p="sm" style={{ background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>{msg}</Text>
          )}

          {isManager && (
            <Group gap={8} wrap="wrap" pt={4}>
              <Button size="sm" loading={loading} onClick={publish}
                variant="gradient" gradient={{ from: '#6366f1', to: '#4f46e5' }}>
                {shift.status === 'published' ? '⬆ Unpublish' : '✓ Publish'}
              </Button>
              <Button component="a" href={`/shifts/${shift.id}`} size="sm" variant="default">
                Manage Staff
              </Button>
              <Button size="sm" color="red" variant="light" loading={loading} onClick={deleteShift} ml="auto">
                Delete
              </Button>
            </Group>
          )}
        </Stack>
      )}
    </Modal>
  )
}

function ShiftFormModal({ opened, locations, onClose, onSaved, defaultDate, initialShift }: {
  opened: boolean; locations: Location[]; onClose: () => void; onSaved: () => void; defaultDate: string; initialShift?: Partial<Shift> | null
}) {
  const [form, setForm] = useState({
    locationId: initialShift?.locationId || (locations[0]?.id ?? ''),
    date: initialShift?.date || defaultDate,
    startTime: initialShift?.startTime || '10:00',
    endTime: initialShift?.endTime || '18:00',
    requiredSkill: initialShift?.requiredSkill || 'server',
    headcount: initialShift?.headcount || 1,
    notes: initialShift?.notes || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const isOvernight = form.endTime < form.startTime

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const isEdit = !!initialShift?.id
    const url = isEdit ? `/api/shifts/${initialShift.id}` : '/api/shifts'
    const method = isEdit ? 'PUT' : 'POST'
    
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    setLoading(false)
    if (d.success) onSaved()
    else setError(d.error)
  }

  return (
    <Modal opened={opened} onClose={onClose} title={initialShift?.id ? "Edit Shift" : "Create New Shift"} size="md" radius="lg">
      <form onSubmit={submit}>
        <Stack gap="md">
          <Group grow>
            <Select
              label="Location"
              data={locations.map(l => ({ value: l.id, label: l.shortName }))}
              value={form.locationId}
              onChange={v => set('locationId', v ?? '')}
              required
            />
            <TextInput
              label="Date"
              type="date"
              value={form.date}
              onChange={e => set('date', e.target.value)}
              required
            />
          </Group>
          <Group grow>
            <TextInput
              label="Start Time"
              type="time"
              value={form.startTime}
              onChange={e => set('startTime', e.target.value)}
              required
            />
            <TextInput
              label="End Time"
              type="time"
              value={form.endTime}
              onChange={e => set('endTime', e.target.value)}
              required
            />
          </Group>
          <Group grow>
            <Select
              label="Required Skill"
              data={SKILLS.map(s => ({ value: s, label: s.replace('_', ' ') }))}
              value={form.requiredSkill}
              onChange={v => set('requiredSkill', v ?? 'server')}
            />
            <NumberInput
              label="Headcount"
              min={1}
              max={20}
              value={form.headcount}
              onChange={v => set('headcount', v)}
              required
            />
          </Group>
          <TextInput
            label="Notes (optional)"
            placeholder="Any special instructions..."
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
          />

          {isOvernight && (
            <Text size="xs" c="cyan" p="sm" style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8 }}>
              🌙 Overnight shift detected — ends the following day
            </Text>
          )}
          {error && (
            <Text size="sm" c="red" p="sm" style={{ background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>{error}</Text>
          )}

          <Group justify="flex-end" gap={8}>
            <Button variant="default" onClick={onClose} type="button">Cancel</Button>
            <Button type="submit" loading={loading} variant="gradient" gradient={{ from: '#6366f1', to: '#4f46e5' }}>
              {initialShift?.id ? 'Save Changes' : 'Create Shift'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
