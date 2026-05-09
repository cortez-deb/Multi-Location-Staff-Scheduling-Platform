// POST /api/shifts/[id]/publish  — publish or unpublish a week's schedule
import { db, findShift, nextId } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { emitToUsers, emitToLocation } from '@/lib/socket'
import type { NextRequest } from 'next/server'

export async function POST(req: NextRequest, ctx: RouteContext<'/api/shifts/[id]/publish'>) {
  const session = await requireSession().catch(() => null)
  if (!session) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'staff') return Response.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params
  const { action = 'publish', weekOf, locationId } = await req.json()

  // Publish/unpublish single shift OR a whole week+location
  let targets = weekOf && locationId
    ? db.shifts.filter(s => {
        const d = new Date(weekOf + 'T12:00:00Z')
        const dow = d.getUTCDay()
        const mon = new Date(d); mon.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow))
        const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6)
        return s.locationId === locationId && s.date >= mon.toISOString().split('T')[0] && s.date <= sun.toISOString().split('T')[0]
      })
    : [findShift(id)].filter(Boolean) as typeof db.shifts

  if (targets.length === 0) return Response.json({ success: false, error: 'No shifts found' }, { status: 404 })

  const now = new Date().toISOString()
  // Map: userId → list of shifts they were assigned to (for per-user targeted notifications)
  const staffShifts = new Map<string, typeof targets>()

  for (const shift of targets) {
    if (action === 'publish' && shift.status === 'draft') {
      const before = { ...shift }
      shift.status = 'published'
      shift.publishedAt = now
      shift.updatedAt = now

      // Accumulate per-user assigned shifts
      for (const sid of shift.assignedStaff) {
        if (!staffShifts.has(sid)) staffShifts.set(sid, [])
        staffShifts.get(sid)!.push(shift)
      }

      writeAuditLog({ entityType: 'shift', entityId: shift.id, action: 'published', before, after: { ...shift }, performedBy: session.userId, locationId: shift.locationId as any })

    } else if (action === 'unpublish' && shift.status === 'published') {
      const before = { ...shift }
      shift.status = 'draft'
      shift.publishedAt = undefined
      shift.updatedAt = now
      writeAuditLog({ entityType: 'shift', entityId: shift.id, action: 'unpublished', before, after: { ...shift }, performedBy: session.userId, locationId: shift.locationId as any })
    }
  }

  if (action === 'publish') {
    // ── Per-user notifications (only what affects them) ──────
    for (const [staffId, userShifts] of staffShifts) {
      const shiftCount = userShifts.length
      const summary = userShifts
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 3)
        .map(s => `${s.date} ${s.startTime} (${s.requiredSkill})`)
        .join(', ')
      const extra = shiftCount > 3 ? ` +${shiftCount - 3} more` : ''

      const msg = `You have ${shiftCount} shift${shiftCount > 1 ? 's' : ''} published: ${summary}${extra}.`
      db.notifications.push({
        id: nextId('notif'), userId: staffId, type: 'schedule_published',
        title: 'Schedule Published', message: msg,
        read: false, createdAt: now,
      })
      // Send privately to each staff member — they only see their own shifts
      emitToUsers([staffId], 'schedule_published', {
        title: 'Schedule Published',
        message: msg,
        data: { shiftIds: userShifts.map(s => s.id) },
      })
    }

    // ── Location broadcast (managers watching this location) ─
    const affectedLocId = locationId ?? targets[0]?.locationId
    if (affectedLocId) {
      emitToLocation(affectedLocId, 'shift_updated', {
        title: 'Schedule published',
        message: `${targets.length} shift${targets.length > 1 ? 's' : ''} published for week of ${weekOf ?? targets[0]?.date}.`,
        data: { locationId: affectedLocId, count: targets.length },
      })
    }
  }

  return Response.json({ success: true, data: { published: targets.length } })
}
