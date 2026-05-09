// GET POST /api/staff/[id]/availability
import { db, findUser, nextId } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import { emitToUsers, emitToManagers } from '@/lib/socket'
import type { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/staff/[id]/availability'>) {
  const session = await requireSession().catch(() => null)
  if (!session) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  return Response.json({
    success: true,
    data: {
      recurring: db.recurringAvailability.filter(a => a.userId === id),
      exceptions: db.availabilityExceptions.filter(a => a.userId === id),
    },
  })
}

export async function POST(req: NextRequest, ctx: RouteContext<'/api/staff/[id]/availability'>) {
  const session = await requireSession().catch(() => null)
  if (!session) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params

  if (session.role === 'staff' && session.userId !== id) {
    return Response.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { type } = body
  const now = new Date().toISOString()

  if (type === 'recurring') {
    const { dayOfWeek, startTime, endTime, available } = body
    // Replace existing for same day
    const idx = db.recurringAvailability.findIndex(a => a.userId === id && a.dayOfWeek === dayOfWeek)
    const entry = { id: nextId('avail'), userId: id, dayOfWeek, startTime, endTime, available: available !== false, updatedAt: now }
    if (idx >= 0) db.recurringAvailability[idx] = entry
    else db.recurringAvailability.push(entry)

    emitToManagers('availability_changed', { title: 'Availability Updated', message: `Staff member updated their recurring availability.`, data: { userId: id } })
    return Response.json({ success: true, data: entry })
  }

  if (type === 'exception') {
    const { date, startTime, endTime, available, reason } = body
    const idx = db.availabilityExceptions.findIndex(a => a.userId === id && a.date === date)
    const entry = { id: nextId('exc'), userId: id, date, startTime, endTime, available: available !== false, reason, createdAt: now }
    if (idx >= 0) db.availabilityExceptions[idx] = entry
    else db.availabilityExceptions.push(entry)

    // Notify managers
    const managers = db.users.filter(u => u.role === 'manager' || u.role === 'admin')
    const user = findUser(id)
    for (const mgr of managers) {
      db.notifications.push({
        id: nextId('notif'), userId: mgr.id, type: 'availability_changed',
        title: 'Availability Updated',
        message: `${user?.name ?? id} updated their availability for ${date}.`,
        read: false, createdAt: now, relatedUserId: id,
      })
    }
    const mgrIds = managers.map(m => m.id)
    emitToUsers(mgrIds, 'availability_changed', {
      title: 'Availability Updated',
      message: `${user?.name ?? id} updated their availability for ${date}.`,
      data: { userId: id, date },
    })
    return Response.json({ success: true, data: entry })
  }

  return Response.json({ success: false, error: 'Invalid type' }, { status: 400 })
}
