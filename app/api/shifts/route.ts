// GET /api/shifts  POST /api/shifts
import { db, nextId } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { sseEmitter } from '@/lib/sse'
import type { NextRequest } from 'next/server'
import type { Shift } from '@/lib/types'

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const locationId = searchParams.get('locationId')
  const weekOf = searchParams.get('weekOf')     // "YYYY-MM-DD" any day in week
  const status = searchParams.get('status')
  const staffId = searchParams.get('staffId')

  let shifts = [...db.shifts]

  // Role-based filter: managers only see their locations
  if (session.role === 'manager') {
    shifts = shifts.filter(s => session.managedLocations.includes(s.locationId as any))
  }
  if (session.role === 'staff') {
    // Staff only see published shifts + their own assignments
    shifts = shifts.filter(s =>
      s.status === 'published' ||
      s.assignedStaff.includes(session.userId)
    )
  }

  if (locationId) shifts = shifts.filter(s => s.locationId === locationId)
  if (status) shifts = shifts.filter(s => s.status === status)
  if (staffId) shifts = shifts.filter(s => s.assignedStaff.includes(staffId))

  if (weekOf) {
    const d = new Date(weekOf + 'T12:00:00Z')
    const dow = d.getUTCDay()
    const mondayOff = dow === 0 ? -6 : 1 - dow
    const mon = new Date(d); mon.setUTCDate(d.getUTCDate() + mondayOff)
    const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6)
    const monStr = mon.toISOString().split('T')[0]
    const sunStr = sun.toISOString().split('T')[0]
    shifts = shifts.filter(s => s.date >= monStr && s.date <= sunStr)
  }

  shifts.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
  return Response.json({ success: true, data: shifts })
}

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'staff') return Response.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { locationId, date, startTime, endTime, requiredSkill, headcount, notes } = body

  if (!locationId || !date || !startTime || !endTime || !requiredSkill || !headcount) {
    return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 })
  }

  // Managers can only create for their locations
  if (session.role === 'manager' && !session.managedLocations.includes(locationId)) {
    return Response.json({ success: false, error: 'Not authorized for this location' }, { status: 403 })
  }

  const h = parseInt(startTime.split(':')[0])
  const dow = new Date(date + 'T12:00:00Z').getUTCDay()
  const isPremium = (dow === 5 || dow === 6) && h >= 17

  const shift: Shift = {
    id: nextId('shift'),
    locationId, date, startTime, endTime,
    isOvernight: endTime < startTime,
    requiredSkill, headcount,
    assignedStaff: [],
    status: 'draft',
    editCutoffHours: 48,
    createdBy: session.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPremium,
    notes,
  }

  db.shifts.push(shift)
  writeAuditLog({ entityType: 'shift', entityId: shift.id, action: 'created', before: null, after: shift, performedBy: session.userId, locationId: shift.locationId as any })
  sseEmitter.broadcast('shift_created', shift)

  return Response.json({ success: true, data: shift }, { status: 201 })
}
