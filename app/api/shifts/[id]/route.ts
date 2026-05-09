// GET PUT DELETE /api/shifts/[id]
import { db, findShift, nextId } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { emitToUsers, emitToLocation } from '@/lib/socket'
import type { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/shifts/[id]'>) {
  const session = await requireSession().catch(() => null)
  if (!session) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const shift = findShift(id)
  if (!shift) return Response.json({ success: false, error: 'Shift not found' }, { status: 404 })
  return Response.json({ success: true, data: shift })
}

export async function PUT(req: NextRequest, ctx: RouteContext<'/api/shifts/[id]'>) {
  const session = await requireSession().catch(() => null)
  if (!session) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'staff') return Response.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params
  const shift = findShift(id)
  if (!shift) return Response.json({ success: false, error: 'Shift not found' }, { status: 404 })

  // Enforce edit cutoff for published shifts
  if (shift.status === 'published') {
    const shiftStart = new Date(`${shift.date}T${shift.startTime}:00`)
    const cutoff = new Date(shiftStart.getTime() - shift.editCutoffHours * 3600000)
    if (new Date() > cutoff) {
      return Response.json({ success: false, error: `Cannot edit: within ${shift.editCutoffHours}h cutoff` }, { status: 400 })
    }
  }

  const before = { ...shift }
  const body = await req.json()
  const allowed = ['date','startTime','endTime','requiredSkill','headcount','notes','editCutoffHours']
  for (const key of allowed) {
    if (key in body) (shift as any)[key] = body[key]
  }
  shift.isOvernight = shift.endTime < shift.startTime
  shift.updatedAt = new Date().toISOString()

  writeAuditLog({ entityType: 'shift', entityId: shift.id, action: 'updated', before, after: { ...shift }, performedBy: session.userId, locationId: shift.locationId as any })

  // Cancel any pending swaps for this shift and notify those users
  const now = new Date().toISOString()
  const pendingSwaps = db.swapRequests.filter(s => s.shiftId === shift.id && s.status === 'pending')
  const swapAffectedUsers = new Set<string>()

  for (const swap of pendingSwaps) {
    swap.status = 'cancelled'
    swap.cancelReason = 'Shift was edited by manager'
    swapAffectedUsers.add(swap.requesterId)
    if (swap.targetStaffId) swapAffectedUsers.add(swap.targetStaffId)

    db.notifications.push({
      id: nextId('notif'), userId: swap.requesterId, type: 'swap_cancelled',
      title: 'Swap Request Cancelled',
      message: 'Your swap request was cancelled because the shift was edited.',
      read: false, createdAt: now, relatedSwapId: swap.id,
    })
  }
  if (swapAffectedUsers.size > 0) {
    emitToUsers([...swapAffectedUsers], 'swap_cancelled', {
      title: 'Swap Cancelled',
      message: 'A swap request was cancelled because the shift was edited.',
      data: { shiftId: shift.id },
    })
  }

  // Notify assigned staff that their shift details changed
  if (shift.status === 'published' && shift.assignedStaff.length > 0) {
    const msg = `Your ${shift.requiredSkill} shift on ${shift.date} has been updated to ${shift.startTime}–${shift.endTime}.`
    for (const sid of shift.assignedStaff) {
      db.notifications.push({
        id: nextId('notif'), userId: sid, type: 'shift_changed',
        title: 'Shift Updated', message: msg,
        read: false, createdAt: now, relatedShiftId: shift.id,
      })
    }
    emitToUsers(shift.assignedStaff, 'shift_changed', {
      title: 'Shift Updated', message: msg, data: { shiftId: shift.id },
    })
  }

  // Refresh UI for location managers
  emitToLocation(shift.locationId, 'shift_updated', {
    title: 'Shift edited',
    message: `${shift.requiredSkill} shift on ${shift.date} was updated.`,
    data: { shiftId: shift.id },
  })

  return Response.json({ success: true, data: shift })
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/shifts/[id]'>) {
  const session = await requireSession().catch(() => null)
  if (!session) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'staff') return Response.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params
  const idx = db.shifts.findIndex(s => s.id === id)
  if (idx === -1) return Response.json({ success: false, error: 'Shift not found' }, { status: 404 })

  const shift = db.shifts[idx]
  const now = new Date().toISOString()
  db.shifts.splice(idx, 1)

  writeAuditLog({ entityType: 'shift', entityId: id, action: 'deleted', before: shift, after: null, performedBy: session.userId, locationId: shift.locationId as any })

  // Notify assigned staff that their shift was cancelled
  if (shift.status === 'published' && shift.assignedStaff.length > 0) {
    const msg = `Your ${shift.requiredSkill} shift on ${shift.date} at ${shift.startTime} has been cancelled.`
    for (const sid of shift.assignedStaff) {
      db.notifications.push({
        id: nextId('notif'), userId: sid, type: 'shift_changed',
        title: 'Shift Cancelled', message: msg,
        read: false, createdAt: now, relatedShiftId: id,
      })
    }
    emitToUsers(shift.assignedStaff, 'shift_cancelled', {
      title: 'Shift Cancelled', message: msg, data: { shiftId: id },
    })
  }

  emitToLocation(shift.locationId, 'shift_updated', {
    title: 'Shift deleted',
    message: `${shift.requiredSkill} shift on ${shift.date} was removed.`,
    data: { shiftId: id, deleted: true },
  })

  return Response.json({ success: true })
}
