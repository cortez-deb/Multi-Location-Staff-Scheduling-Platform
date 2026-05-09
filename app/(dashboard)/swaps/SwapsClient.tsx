'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box, Group, Stack, Text, Title, Badge, Button, Paper, Modal,
  Select, Textarea, Divider,
} from '@mantine/core'
import type { Session, Location } from '@/lib/types'

const STATUS_COLOR: Record<string, string> = {
  pending: 'indigo', accepted: 'cyan', approved: 'green',
  rejected: 'red', cancelled: 'gray', expired: 'gray',
}

export function SwapsClient({ session, swaps, locations, allStaff }: {
  session: Session; swaps: any[]; locations: Location[]; allStaff: any[]
}) {
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const isManager = session.role !== 'staff'

  const filtered = filter === 'all' ? swaps : swaps.filter(s => s.status === filter)
  const pendingCount = swaps.filter(s => s.status === 'pending' || s.status === 'accepted').length

  async function act(id: string, action: string, note = '') {
    setLoading(id)
    await fetch(`/api/swaps/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, managerNote: note }),
    })
    setLoading(null); router.refresh()
  }

  return (
    <Box p={32} pb={48}>
      {/* Header */}
      <Group align="flex-end" justify="space-between" mb={28} wrap="wrap" gap={12}>
        <Box>
          <Title order={1} size={24} fw={800}>Swaps & Drops</Title>
          <Text size="sm" c="dimmed" mt={4}>
            {pendingCount} pending action{pendingCount !== 1 ? 's' : ''}
          </Text>
        </Box>
        <Group gap={8} wrap="wrap">
          {['all', 'pending', 'accepted', 'approved', 'rejected', 'cancelled'].map(f => (
            <Button
              key={f}
              size="xs"
              variant={filter === f ? 'filled' : 'subtle'}
              color={filter === f ? 'indigo' : 'gray'}
              onClick={() => setFilter(f)}
              style={{ textTransform: 'capitalize' }}
            >
              {f}
            </Button>
          ))}
        </Group>
        {session.role === 'staff' && (
          <Button size="sm" variant="gradient" gradient={{ from: '#6366f1', to: '#4f46e5' }}
            onClick={() => setShowCreate(true)}>
            + Request Swap/Drop
          </Button>
        )}
      </Group>

      {filtered.length === 0 ? (
        <Box style={{ textAlign: 'center', padding: '80px 24px' }}>
          <Text size="3rem" mb={12}>🔄</Text>
          <Text c="dimmed">No swap requests found</Text>
        </Box>
      ) : (
        <Stack gap={12}>
          {filtered.map(swap => {
            const loc = locations.find(l => l.id === swap.shift?.locationId)
            const canApprove = isManager && (swap.status === 'pending' && swap.type === 'drop' || swap.status === 'accepted')
            const canAccept = session.userId === swap.targetStaffId && swap.status === 'pending'
            const canCancel = (session.userId === swap.requesterId && swap.status === 'pending') || isManager
            const isPending = swap.status === 'pending' || swap.status === 'accepted'

            return (
              <Paper key={swap.id} p="md" radius="lg" className="glass-hover"
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderLeft: isPending ? '3px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                }}>
                <Group gap={16} align="flex-start" wrap="wrap">
                  <Box flex={1} style={{ minWidth: 0 }}>
                    <Group gap={8} mb={8} wrap="wrap">
                      <Badge size="sm" color={swap.type === 'drop' ? 'yellow' : 'cyan'} variant="light">
                        {swap.type === 'drop' ? '⬇ Drop' : '🔄 Swap'}
                      </Badge>
                      <Badge size="sm" color={STATUS_COLOR[swap.status] ?? 'gray'} variant="light">
                        {swap.status}
                      </Badge>
                      {swap.shift?.isPremium && <Badge size="sm" color="yellow" variant="light">⭐ Premium</Badge>}
                    </Group>

                    <Text size="sm">
                      <Text span fw={700}>{swap.requester?.name ?? swap.requesterId}</Text>
                      {swap.type === 'swap' ? (
                        <> wants to swap with <Text span fw={700}>{swap.target?.name ?? 'unknown'}</Text></>
                      ) : <> is dropping their shift</>}
                    </Text>

                    {swap.shift && (
                      <Text size="xs" c="dimmed" mt={4}>
                        📍 {loc?.shortName} · {swap.shift.date} {swap.shift.startTime}–{swap.shift.endTime}
                      </Text>
                    )}
                    {swap.requesterNote && (
                      <Text size="xs" c="dimmed" mt={6} fs="italic">"{swap.requesterNote}"</Text>
                    )}
                    {swap.managerNote && (
                      <Text size="xs" c="yellow" mt={6}>Manager note: {swap.managerNote}</Text>
                    )}
                    <Text size="xs" c="dimmed" mt={6}>
                      Created {new Date(swap.createdAt).toLocaleDateString()} · Expires {new Date(swap.expiresAt).toLocaleDateString()}
                    </Text>
                  </Box>

                  <Group gap={8} style={{ flexShrink: 0 }} wrap="wrap">
                    {canAccept && (
                      <Button size="xs" color="green" loading={loading === swap.id}
                        onClick={() => act(swap.id, 'accept')}>✓ Accept</Button>
                    )}
                    {canApprove && (
                      <Button size="xs" color="indigo" loading={loading === swap.id}
                        onClick={() => act(swap.id, 'approve')}>✓ Approve</Button>
                    )}
                    {(swap.status === 'pending' || swap.status === 'accepted') && isManager && (
                      <Button size="xs" color="red" variant="light" loading={loading === swap.id}
                        onClick={() => act(swap.id, 'reject', 'Not approved')}>✗ Reject</Button>
                    )}
                    {canCancel && (
                      <Button size="xs" variant="subtle" color="gray" loading={loading === swap.id}
                        onClick={() => act(swap.id, 'cancel')}>Cancel</Button>
                    )}
                    <Button component="a" href={`/shifts/${swap.shiftId}`} size="xs" variant="default">
                      View
                    </Button>
                  </Group>
                </Group>
              </Paper>
            )
          })}
        </Stack>
      )}

      {/* Create Swap Modal */}
      <CreateSwapModal
        opened={showCreate}
        session={session}
        allStaff={allStaff}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); router.refresh() }}
      />
    </Box>
  )
}

function CreateSwapModal({ opened, session, allStaff, onClose, onCreated }: {
  opened: boolean; session: Session; allStaff: any[]; onClose: () => void; onCreated: () => void
}) {
  const [form, setForm] = useState({ type: 'drop', shiftId: '', targetStaffId: '', requesterNote: '' })
  const [myShifts, setMyShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useState(() => {
    fetch(`/api/shifts?staffId=${session.userId}&status=published`).then(r => r.json()).then(d => {
      if (d.success) setMyShifts(d.data.filter((s: any) => s.date >= new Date().toISOString().split('T')[0]))
    })
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const res = await fetch('/api/swaps', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    setLoading(false)
    if (d.success) onCreated()
    else setError(d.error)
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Request Swap / Drop" size="md" radius="lg">
      <form onSubmit={submit}>
        <Stack gap="md">
          <Box>
            <Text size="sm" fw={500} c="gray.4" mb={8}>Type</Text>
            <Group gap={8}>
              {['drop', 'swap'].map(t => (
                <Button
                  key={t}
                  size="sm"
                  variant={form.type === t ? 'filled' : 'default'}
                  color={form.type === t ? 'indigo' : undefined}
                  onClick={() => setForm(f => ({ ...f, type: t }))}
                  type="button"
                >
                  {t === 'drop' ? '⬇ Drop Shift' : '🔄 Swap Shift'}
                </Button>
              ))}
            </Group>
          </Box>

          <Select
            label="Your Shift"
            placeholder="Select a shift…"
            data={myShifts.map(s => ({ value: s.id, label: `${s.date} ${s.startTime}–${s.endTime} (${s.requiredSkill})` }))}
            value={form.shiftId}
            onChange={v => setForm(f => ({ ...f, shiftId: v ?? '' }))}
            required
          />

          {form.type === 'swap' && (
            <Select
              label="Swap With"
              placeholder="Select staff…"
              data={allStaff.filter(u => u.id !== session.userId).map(u => ({ value: u.id, label: u.name }))}
              value={form.targetStaffId}
              onChange={v => setForm(f => ({ ...f, targetStaffId: v ?? '' }))}
              required
            />
          )}

          <Textarea
            label="Note (optional)"
            placeholder="Reason for request…"
            value={form.requesterNote}
            onChange={e => setForm(f => ({ ...f, requesterNote: e.target.value }))}
            rows={2}
          />

          {error && (
            <Text size="sm" c="red" p="sm" style={{ background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>
              {error}
            </Text>
          )}

          <Group justify="flex-end" gap={8}>
            <Button variant="default" onClick={onClose} type="button">Cancel</Button>
            <Button type="submit" loading={loading} variant="gradient" gradient={{ from: '#6366f1', to: '#4f46e5' }}>
              Submit Request
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
