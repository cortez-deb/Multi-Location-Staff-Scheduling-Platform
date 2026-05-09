// POST /api/shifts/[id]/assign  — assign or unassign staff
import { db, findShift, findUser, nextId } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import { checkAssignmentConstraints } from '@/lib/constraints'
import { writeAuditLog } from '@/lib/audit'
import { emitToUsers, emitToManagers } from '@/lib/socket'
import type { NextRequest } from 'next/server'

export async function POST(req: NextRequest, ctx: RouteContext<'/api/shifts/[id]/assign'>) {
  const session = await requireSession().catch(() => null)
  if (!session) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'staff') return Response.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params
  const shift = findShift(id)
  if (!shift) return Response.json({ success: false, error: 'Shift not found' }, { status: 404 })

  const { staffId, action = 'assign', overrideReason } = await req.json()
  const user = findUser(staffId)
  if (!user) return Response.json({ success: false, error: 'Staff not found' }, { status: 404 })

  if (action === 'unassign') {
    const before = { ...shift }
    shift.assignedStaff = shift.assignedStaff.filter(id => id !== staffId)
    shift.updatedAt = new Date().toISOString()
    writeAuditLog({ entityType: 'shift', entityId: shift.id, action: 'unassigned', before, after: { ...shift }, performedBy: session.userId, locationId: shift.locationId as any, metadata: { staffId } })

    // Notify the unassigned user if shift is published
    if (shift.status === 'published') {
      db.notifications.push({
        id: nextId('notif'), userId: staffId, type: 'shift_changed',
        title: 'Shift Removed', message: `You've been unassigned from the ${shift.requiredSkill} shift on ${shift.date} at ${shift.startTime}.`,
        read: false, createdAt: new Date().toISOString(), relatedShiftId: shift.id,
      })
      emitToUsers([staffId], 'shift_cancelled', {
        title: 'Shift Removed',
        message: `You've been unassigned from the ${shift.requiredSkill} shift on ${shift.date} at ${shift.startTime}.`,
        data: { shiftId: shift.id },
      })
    }
    return Response.json({ success: true, data: shift })
  }

  // Check constraints
  const result = checkAssignmentConstraints(shift, user)
  const errors = result.violations.filter(v => v.severity === 'error')
  const overrideRequired = result.violations.filter(v => v.severity === 'override_required')

  if (errors.length > 0) {
    return Response.json({ success: false, error: 'Constraint violations', violations: result.violations }, { status: 422 })
  }

  if (overrideRequired.length > 0 && !overrideReason) {
    return Response.json({
      success: false, error: 'Manager override required',
      violations: result.violations, requiresOverride: true,
    }, { status: 422 })
  }

  if (shift.assignedStaff.includes(staffId)) {
    return Response.json({ success: false, error: 'Staff already assigned' }, { status: 400 })
  }

  if (shift.assignedStaff.length >= shift.headcount) {
    return Response.json({ success: false, error: 'Shift is at full capacity' }, { status: 400 })
  }

  const before = { ...shift }
  shift.assignedStaff.push(staffId)
  shift.updatedAt = new Date().toISOString()

  writeAuditLog({
    entityType: 'shift', entityId: shift.id, action: 'assigned', before, after: { ...shift },
    performedBy: session.userId, locationId: shift.locationId as any,
    metadata: { staffId, overrideReason, warnings: result.warnings.map(w => w.ruleId) },
  })

  // Only notify if published — don't spam users about draft shifts
  if (shift.status === 'published') {
    const msg = `You've been assigned a ${shift.requiredSkill} shift on ${shift.date} at ${shift.startTime}.`
    db.notifications.push({
      id: nextId('notif'), userId: staffId, type: 'shift_assigned',
      title: 'New Shift Assigned', message: msg,
      read: false, createdAt: new Date().toISOString(), relatedShiftId: shift.id,
    })
    emitToUsers([staffId], 'shift_assigned', { title: 'New Shift Assigned', message: msg, data: { shiftId: shift.id } })
  }

  // Notify managers so they see the roster update in real time
  emitToManagers('shift_updated', {
    title: 'Shift roster updated',
    message: `${user.name} assigned to ${shift.requiredSkill} on ${shift.date}.`,
    data: { shiftId: shift.id, staffId },
  })

  return Response.json({ success: true, data: shift, warnings: result.warnings })
}
