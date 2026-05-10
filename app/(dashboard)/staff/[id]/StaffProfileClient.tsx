'use client'
import { useState } from 'react'
import { Text } from '@mantine/core'
import { useRouter } from 'next/navigation'
import type { Session, Location, RecurringAvailability, AvailabilityException, Shift } from '@/lib/types'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function StaffProfileClient({ session, user, locations, availability, recentShifts, history }: {
  session: Session; user: any; locations: Location[]
  availability: { recurring: RecurringAvailability[]; exceptions: AvailabilityException[] }
  recentShifts: Shift[]
  history?: any[]
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const canEdit = session.user.id === user.id || session.user.role !== 'staff'

  async function saveAvail(dayOfWeek: number, startTime: string, endTime: string, available: boolean) {
    setSaving(true)
    await fetch(`/api/staff/${user.id}/availability`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'recurring', dayOfWeek, startTime, endTime, available }),
    })
    setSaving(false); router.refresh()
  }

  async function addException(date: string, available: boolean, reason: string) {
    setSaving(true); setMsg('')
    const res = await fetch(`/api/staff/${user.id}/availability`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'exception', date, available, reason }),
    })
    const d = await res.json()
    setSaving(false)
    if (d.success) { setMsg('Saved!'); router.refresh() }
    else setMsg(d.error)
  }

  const userLocs = locations.filter(l => user.certifiedLocations.includes(l.id))

  return (
    <div style={{ padding: '28px 32px 40px', maxWidth: 960, margin: '0 auto' }}>
      <a href="/staff" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>← Staff Directory</a>

      {/* Profile Header */}
      <div className="card" style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap' }}>
        <div className="avatar" style={{ background: user.avatarColor, color: '#fff', width: 72, height: 72, fontSize: 24 }}>{user.avatarInitials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{user.name}</h1>
            <span className={`badge ${user.role === 'manager' ? 'badge-warning' : 'badge-info'}`}>{user.role}</span>
            {!user.isActive && <span className="badge badge-error">Inactive</span>}
          </div>
          <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 4 }}>{user.email} {user.phone && `· ${user.phone}`}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
            Reports to: {user.role === 'admin' ? '—' : user.role === 'manager' ? 'Admin' : (user.manager?.name || 'Unassigned')}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {user.skills.map((sk: string) => <span key={sk} className={`badge skill-${sk}`}>{sk.replace('_',' ')}</span>)}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {userLocs.map(l => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: 'var(--color-surface-3)', borderRadius: 9999 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: l.color }} />
                <span style={{ fontSize: 12 }}>{l.shortName}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Desired Hours/Week</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-brand-400)' }}>{user.desiredHoursPerWeek}h</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>max {user.maxHoursPerWeek}h</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>Hired {user.hireDate}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Recurring Availability */}
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Weekly Availability</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DAYS.map((day, dow) => {
              const avail = availability.recurring.find(a => a.dayOfWeek === dow)
              return (
                <div key={dow} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 36, fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)' }}>{day}</span>
                  {avail?.available ? (
                    <>
                      <span style={{ fontSize: 13, flex: 1 }}>{avail.startTime} – {avail.endTime}</span>
                      <span className="badge badge-published" style={{ fontSize: 9 }}>Available</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 13, color: 'var(--color-text-muted)', flex: 1 }}>
                      {avail ? 'Unavailable' : 'Not set'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Exceptions + Recent Shifts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Exceptions */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>One-off Exceptions</h2>
            {canEdit && (
              <ExceptionForm onSubmit={addException} saving={saving} msg={msg} />
            )}
            {availability.exceptions.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 8 }}>No exceptions</p>
            )}
            {availability.exceptions.slice(0, 5).map(e => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: 13 }}>{e.date}</span>
                <span className={`badge ${e.available ? 'badge-published' : 'badge-error'}`} style={{ fontSize: 10 }}>
                  {e.available ? 'Available' : 'Unavailable'}
                </span>
              </div>
            ))}
          </div>

          {/* Recent Shifts */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>Recent Shifts</h2>
            {recentShifts.length === 0 && <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No shifts found</p>}
            {recentShifts.slice(0, 5).map(s => {
              const loc = locations.find(l => l.id === s.locationId)
              return (
                <div key={s.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.date} {s.startTime}–{s.endTime}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{loc?.shortName}</div>
                  </div>
                  <span className={`badge skill-${s.requiredSkill}`} style={{ fontSize: 10 }}>{s.requiredSkill.replace('_',' ')}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      
      {session.user.role === 'admin' && history && history.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Reporting History</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {history.map(item => (
              <div key={item.id} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.supersededAt ? 'var(--color-border)' : '#10b981' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text size="sm" fw={600}>
                      {item.manager ? item.manager.name : <span style={{ color: 'var(--color-text-muted)' }}>Unassigned</span>}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {new Date(item.assignedAt).toLocaleDateString()} – {item.supersededAt ? new Date(item.supersededAt).toLocaleDateString() : 'Present'}
                    </Text>
                  </div>
                  <Text size="xs" c="dimmed">Assigned by {item.assignedBy?.name || 'System'}</Text>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ExceptionForm({ onSubmit, saving, msg }: { onSubmit: (date: string, available: boolean, reason: string) => void; saving: boolean; msg: string }) {
  const [date, setDate] = useState('')
  const [available, setAvailable] = useState(false)
  const [reason, setReason] = useState('')
  return (
    <div style={{ marginBottom: 12, padding: '12px', background: 'var(--color-surface-2)', borderRadius: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 8 }}>
        <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
        <select className="input" value={available ? '1' : '0'} onChange={e => setAvailable(e.target.value === '1')}>
          <option value="0">Unavailable</option>
          <option value="1">Available</option>
        </select>
      </div>
      <input className="input" placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} style={{ marginBottom: 8 }} />
      <button className="btn btn-primary btn-sm" onClick={() => date && onSubmit(date, available, reason)} disabled={!date || saving}>
        {saving ? 'Saving…' : 'Add Exception'}
      </button>
      {msg && <span style={{ fontSize: 12, color: msg === 'Saved!' ? '#10b981' : '#ef4444', marginLeft: 8 }}>{msg}</span>}
    </div>
  )
}
