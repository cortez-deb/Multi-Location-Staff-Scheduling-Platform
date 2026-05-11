'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Session, Shift, Location, AuditLog } from '@/lib/types'

const SKILL_COLORS: Record<string, string> = {
  bartender: '#a78bfa', line_cook: '#fb923c', server: '#22d3ee',
  host: '#34d399', supervisor: '#fbbf24', expo: '#fb7185', busser: '#94a3b8',
}

import { Modal, Button, Group, Stack, Text, Title, Badge, Paper, Box } from '@mantine/core'
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
  const skillSlug = (currentSkill?.name || shift.requiredSkill).toLowerCase().replace(' ', '_')

  return (
    <div style={{ padding: '28px 32px 40px', maxWidth: 1000, margin: '0 auto' }}>
      <Modal opened={showDelete} onClose={() => setShowDelete(false)} title="Confirm Delete" size="sm" radius="md" centered>
        <Text size="sm" mb="md">Are you sure you want to delete this shift? This cannot be undone.</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setShowDelete(false)}>Cancel</Button>
          <Button color="red" onClick={deleteShift} loading={loading}>Delete</Button>
        </Group>
      </Modal>

      <ShiftFormModal
        opened={showEdit}
        onClose={() => setShowEdit(false)}
        onSaved={() => { setShowEdit(false); router.refresh() }}
        locations={locations}
        initialShift={shift}
        skills={apiSkills}
      />

      {/* Back */}
      <a href="/shifts" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>← Back to Shifts</a>

      {/* Header */}
      <div className="card" style={{ marginBottom: 24, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <Badge color={SKILL_COLORS[skillSlug] ?? 'indigo'} variant="filled" size="lg" radius="sm">{skillLabel}</Badge>
              <Badge color={shift.status === 'published' ? 'green' : 'gray'} variant="dot" size="lg">{shift.status}</Badge>
              {shift.isPremium && <Badge color="orange" variant="light">⭐ Premium</Badge>}
              {shift.isOvernight && <Badge color="cyan" variant="light">🌙 Overnight</Badge>}
              {isLocked && <Badge color="red" variant="filled" leftSection={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width: 12, height: 12}}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>}>Locked</Badge>}
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{location.shortName}</h1>
            <Text c="dimmed" size="sm" mt={4} fw={500}>
              {shift.date} · {shift.startTime}–{shift.endTime} · {location.timezone}
            </Text>
            <Text c="dimmed" size="xs" mt={2}>{location.address}</Text>
            
            {shift.notes && (
              <Paper mt={16} p="md" radius="md" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Text size="10px" fw={700} tt="uppercase" c="dimmed" mb={4} lts="0.05em">Manager Notes</Text>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{shift.notes}</Text>
              </Paper>
            )}
          </div>

          {isManager && (
            <Stack gap={10} style={{ minWidth: 200 }}>
              {isLocked && (
                <Text size="xs" c="red" fw={600} style={{ textAlign: 'right' }}>Locked (Past edit cutoff)</Text>
              )}
              <Group grow gap={8}>
                <Button variant="default" onClick={() => setShowEdit(true)} disabled={isLocked}>Edit</Button>
                <Button variant="light" color={shift.status === 'published' ? 'gray' : 'green'} onClick={togglePublish} loading={loading} disabled={isLocked}>
                  {shift.status === 'published' ? 'Unpublish' : 'Publish'}
                </Button>
              </Group>
              <Button variant="subtle" color="red" fullWidth onClick={() => setShowDelete(true)} disabled={isLocked}>Delete Shift</Button>
            </Stack>
          )}
        </div>

        <div className="divider" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Headcount</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: isFull ? '#10b981' : 'var(--color-text-primary)' }}>
              {shift.assignedStaff.length} / {shift.headcount}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Edit Cutoff</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{shift.editCutoffHours ? `${shift.editCutoffHours}h before shift` : 'Not set'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Created By</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{performerMap[shift.createdBy] ?? shift.createdBy}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Assigned Staff */}
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
            Assigned Staff ({shift.assignedStaff.length}/{shift.headcount})
          </h2>
          {shift.assignedStaff.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No staff assigned yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {shift.assignedStaff.map(sid => {
                const s = allStaff.find(u => u.id === sid)
                if (!s) return null
                return (
                  <div key={sid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 8 }}>
                    <div className="avatar" style={{ background: s.avatarColor, color: '#fff', fontSize: 12 }}>{s.avatarInitials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                        {s.skills.map(sk => {
                          const sObj = apiSkills?.find(apiS => apiS.id === sk)
                          const sLabel = sObj?.name || sk
                          const sSlug = sLabel.toLowerCase().replace(' ', '_')
                          return <span key={sk} className={`badge skill-${sSlug}`} style={{ fontSize: 9 }}>{sLabel}</span>
                        })}
                      </div>
                    </div>
                    {isManager && (
                      <button className="btn btn-sm" onClick={() => unassign(sid)} disabled={loading || isLocked} style={{ color: '#ef4444', opacity: isLocked ? 0.5 : 1 }}>
                        Unassign
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Add Staff */}
        {isManager && !isFull && (
          <div className="card" style={{ opacity: isLocked ? 0.7 : 1, pointerEvents: isLocked ? 'none' : 'auto' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
              {isLocked ? 'Staff Assigned' : 'Add Staff'}
            </h2>
            
            {!isLocked && (
              <Box mb={16}>
                <div style={{ position: 'relative' }}>
                  <input 
                    className="input" 
                    placeholder="Search by name or email..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ paddingLeft: 36, fontSize: 13 }}
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ position: 'absolute', left: 12, top: 10, width: 16, height: 16, color: 'var(--color-text-muted)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                </div>
              </Box>
            )}

            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
              {isLocked ? 'Assignment is locked for this shift.' : `Showing ${suggestions.length} eligible (${skillLabel} + certified)`}
            </p>

            {/* Violation messages */}
            {violations.map((v, i) => (
              <div key={i} style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, marginBottom: 8, fontSize: 13 }}>
                <strong style={{ color: '#ef4444' }}>⚠ {v.message}</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 12 }}>{v.detail}</p>
                {v.suggestions?.length > 0 && (
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#10b981' }}>
                    Suggested: {v.suggestions.map((s: any) => s.name).join(', ')}
                  </p>
                )}
              </div>
            ))}
            {warnings.map((v, i) => (
              <div key={i} style={{ padding: '8px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, marginBottom: 8, fontSize: 12, color: '#f59e0b' }}>
                ⚠ {v.message} — {v.detail}
              </div>
            ))}

            {/* Override form */}
            {pendingAssign && (
              <div style={{ marginBottom: 12, padding: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8 }}>
                <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 8 }}>Override reason required:</p>
                <input className="input" style={{ marginBottom: 8 }} placeholder="Document your reason…" value={overrideReason} onChange={e => setOverrideReason(e.target.value)} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-danger btn-sm" onClick={() => assign(pendingAssign, overrideReason)} disabled={!overrideReason || loading}>
                    Confirm Override
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setPendingAssign(null); setViolations([]) }}>Cancel</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto', position: 'relative' }}>
              {fetchingSuggestions && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                  <Text size="xs" c="dimmed">Searching...</Text>
                </div>
              )}
              {suggestions.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--color-surface-2)', borderRadius: 8 }}>
                  <div className="avatar" style={{ background: s.avatarColor, color: '#fff', fontSize: 11, width: 30, height: 30 }}>{s.avatarInitials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{s.email}</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => assign(s.id)} disabled={loading}>+ Assign</button>
                </div>
              ))}
              {suggestions.length === 0 && !fetchingSuggestions && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No matching staff available</p>
              )}
            </div>
            {msg && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{msg}</p>}
          </div>
        )}
      </div>

      {/* Audit Log */}
      {auditLogs.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Audit Trail</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {auditLogs.map((log, i) => (
              <div key={log.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: i < auditLogs.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-brand-500)', marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{performerMap[log.performedBy] ?? log.performedBy}</span>
                    <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{log.action}</span>
                    {(log.metadata as any)?.staffId && (
                      <span style={{ fontSize: 12, color: 'var(--color-brand-400)' }}>
                        → {performerMap[(log.metadata as any).staffId] ?? (log.metadata as any).staffId}
                      </span>
                    )}
                    {(log.metadata as any)?.overrideReason && (
                      <span style={{ fontSize: 11, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                        Override: {(log.metadata as any).overrideReason}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {new Date(log.performedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
