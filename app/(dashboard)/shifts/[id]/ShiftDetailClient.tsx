'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Session, Shift, Location, AuditLog } from '@/lib/types'

const SKILL_COLORS: Record<string, string> = {
  bartender: '#a78bfa', line_cook: '#fb923c', server: '#22d3ee',
  host: '#34d399', supervisor: '#fbbf24', expo: '#fb7185', busser: '#94a3b8',
}

type SafeUser = { id: string; name: string; skills: string[]; certifiedLocations: string[]; avatarInitials: string; avatarColor: string }

export function ShiftDetailClient({ session, shift, location, allStaff, auditLogs, performerMap }: {
  session: Session; shift: Shift; location: Location
  allStaff: SafeUser[]; auditLogs: AuditLog[]; performerMap: Record<string, string>
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [violations, setViolations] = useState<any[]>([])
  const [warnings, setWarnings] = useState<any[]>([])
  const [overrideReason, setOverrideReason] = useState('')
  const [pendingAssign, setPendingAssign] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const isManager = session.user.role !== 'staff'

  const eligible = allStaff.filter(u =>
    u.skills.includes(shift.requiredSkill) &&
    u.certifiedLocations.includes(shift.locationId) &&
    !shift.assignedStaff.includes(u.id)
  )

  async function assign(staffId: string, override?: string) {
    setLoading(true); setViolations([]); setWarnings([]); setMsg('')
    const res = await fetch(`/api/shifts/${shift.id}/assignments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: staffId, overrideReason: override }),
    })
    const d = await res.json()
    setLoading(false)
    
    // If successful (HTTP 201), the response is { assignment, warnings }
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

  const isFull = shift.assignedStaff.length >= shift.headcount

  return (
    <div style={{ padding: '28px 32px 40px', maxWidth: 900, margin: '0 auto' }}>
      {/* Back */}
      <a href="/shifts" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>← Back to Shifts</a>

      {/* Header */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <span className={`badge skill-${shift.requiredSkill}`}>{shift.requiredSkill.replace('_',' ')}</span>
              <span className={`badge ${shift.status === 'published' ? 'badge-published' : 'badge-draft'}`}>{shift.status}</span>
              {shift.isPremium && <span className="badge badge-premium">⭐ Premium</span>}
              {shift.isOvernight && <span className="badge badge-info">🌙 Overnight</span>}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{location.shortName}</h1>
            <p style={{ color: 'var(--color-text-muted)', margin: '6px 0 0', fontSize: 14 }}>
              {shift.date} · {shift.startTime}–{shift.endTime} · {location.timezone}
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: '4px 0 0' }}>{location.address}</p>
          </div>
          {isManager && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className={`btn btn-sm ${shift.status === 'published' ? 'btn-secondary' : 'btn-primary'}`} onClick={togglePublish} disabled={loading}>
                {shift.status === 'published' ? '⬆ Unpublish' : '✓ Publish'}
              </button>
            </div>
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
                        {s.skills.map(sk => <span key={sk} className={`badge skill-${sk}`} style={{ fontSize: 9 }}>{sk.replace('_',' ')}</span>)}
                      </div>
                    </div>
                    {isManager && (
                      <button className="btn btn-danger btn-sm" onClick={() => unassign(sid)} disabled={loading}>Remove</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Add Staff */}
        {isManager && !isFull && (
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Add Staff</h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
              Showing {eligible.length} eligible ({shift.requiredSkill.replace('_',' ')} + certified)
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
              {eligible.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--color-surface-2)', borderRadius: 8 }}>
                  <div className="avatar" style={{ background: s.avatarColor, color: '#fff', fontSize: 11, width: 30, height: 30 }}>{s.avatarInitials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => assign(s.id)} disabled={loading}>+ Assign</button>
                </div>
              ))}
              {eligible.length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No eligible staff available</p>
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
