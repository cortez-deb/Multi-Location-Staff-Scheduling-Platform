// PUT /api/swaps/[id]  — accept, approve, reject, cancel
import { db, findShift, findUser, nextId } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import { emitToUsers, emitToManagers, emitToLocation } from '@/lib/socket'
import { writeAuditLog } from '@/lib/audit'
import type { NextRequest } from 'next/server'

export async function PUT(req: NextRequest, ctx: RouteContext<'/api/swaps/[id]'>) {
  const session = await requireSession().catch(() => null)
  if (!session) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const swap = db.swapRequests.find(s => s.id === id)
  if (!swap) return Response.json({ success: false, error: 'Not found' }, { status: 404 })

  const { action, managerNote } = await req.json()
  const before = { ...swap }
  const now = new Date().toISOString()
  const notifBase = { read: false, createdAt: now, relatedSwapId: swap.id, relatedShiftId: swap.shiftId }

  if (action === 'accept' && session.userId === swap.targetStaffId) {
    // Staff B accepts a swap request → notify requester + managers at that location
    swap.status = 'accepted'

    const shift = findShift(swap.shiftId)
    const acceptMsg = `${session.name} accepted your swap request. Awaiting manager approval.`
    db.notifications.push({ id: nextId('notif'), userId: swap.requesterId, type: 'swap_accepted', title: 'Swap Accepted', message: acceptMsg, ...notifBase })
    emitToUsers([swap.requesterId], 'swap_accepted', { title: 'Swap Accepted', message: acceptMsg, data: { swapId: swap.id } })

    if (shift) {
      const managers = db.users.filter(u => (u.role === 'manager' || u.role === 'admin') && u.managedLocations.includes(shift.locationId as any))
      for (const mgr of managers) {
        const msg = `${session.name} accepted a swap. Your approval is needed.`
        db.notifications.push({ id: nextId('notif'), userId: mgr.id, type: 'swap_accepted', title: 'Swap Accepted — Needs Approval', message: msg, ...notifBase })
        emitToUsers([mgr.id], 'swap_accepted', { title: 'Swap Accepted — Needs Approval', message: msg, data: { swapId: swap.id } })
      }
    }

  } else if (action === 'approve' && (session.role === 'manager' || session.role === 'admin')) {
    // Manager approves → reassign shift
    const shift = findShift(swap.shiftId)
    if (!shift) return Response.json({ success: false, error: 'Shift not found' }, { status: 404 })

    if (swap.type === 'swap' && swap.targetStaffId) {
      shift.assignedStaff = shift.assignedStaff.filter(s => s !== swap.requesterId)
      if (!shift.assignedStaff.includes(swap.targetStaffId)) shift.assignedStaff.push(swap.targetStaffId)
    } else if (swap.type === 'drop') {
      shift.assignedStaff = shift.assignedStaff.filter(s => s !== swap.requesterId)
    }
    shift.updatedAt = now
    swap.status = 'approved'
    swap.managerApprovedBy = session.userId
    swap.managerNote = managerNote
    swap.resolvedAt = now

    writeAuditLog({ entityType: 'swap', entityId: swap.id, action: 'approved', before, after: { ...swap }, performedBy: session.userId, locationId: shift.locationId as any })

    // Notify requester and target specifically
    const notifyIds = [swap.requesterId, swap.targetStaffId].filter(Boolean) as string[]
    const approveMsg = 'Your swap/drop request has been approved by the manager.'
    for (const uid of notifyIds) {
      db.notifications.push({ id: nextId('notif'), userId: uid, type: 'swap_approved', title: 'Swap Approved', message: approveMsg, ...notifBase })
    }
    emitToUsers(notifyIds, 'swap_approved', { title: 'Swap Approved', message: approveMsg, data: { swapId: swap.id, shiftId: shift.id } })

    // Refresh managers watching that location
    emitToLocation(shift.locationId, 'shift_updated', {
      title: 'Shift roster updated',
      message: `Swap approved for ${shift.requiredSkill} shift on ${shift.date}.`,
      data: { shiftId: shift.id },
    })

  } else if (action === 'reject' && (session.role === 'manager' || session.role === 'admin')) {
    swap.status = 'rejected'
    swap.managerNote = managerNote
    swap.resolvedAt = now

    const notifyIds = [swap.requesterId, swap.targetStaffId].filter(Boolean) as string[]
    const rejectMsg = managerNote ?? 'Your swap request was rejected.'
    for (const uid of notifyIds) {
      db.notifications.push({ id: nextId('notif'), userId: uid, type: 'swap_rejected', title: 'Swap Rejected', message: rejectMsg, ...notifBase })
    }
    emitToUsers(notifyIds, 'swap_rejected', { title: 'Swap Rejected', message: rejectMsg, data: { swapId: swap.id } })

  } else if (action === 'cancel' && (session.userId === swap.requesterId || session.role !== 'staff')) {
    swap.status = 'cancelled'
    swap.cancelReason = managerNote
    swap.resolvedAt = now

    // Notify everyone involved except the person who cancelled
    const notifyIds = new Set<string>()
    if (swap.targetStaffId && swap.targetStaffId !== session.userId) notifyIds.add(swap.targetStaffId)
    if (swap.requesterId && swap.requesterId !== session.userId) notifyIds.add(swap.requesterId)

    const cancelMsg = 'A swap request involving you was cancelled.'
    for (const uid of Array.from(notifyIds)) {
      db.notifications.push({ id: nextId('notif'), userId: uid, type: 'swap_cancelled', title: 'Swap Cancelled', message: cancelMsg, ...notifBase })
    }
    if (notifyIds.size > 0) {
      emitToUsers(Array.from(notifyIds), 'swap_cancelled', { title: 'Swap Cancelled', message: cancelMsg, data: { swapId: swap.id } })
    }
  } else {
    return Response.json({ success: false, error: 'Invalid action or unauthorized' }, { status: 400 })
  }

  return Response.json({ success: true, data: swap })
}
