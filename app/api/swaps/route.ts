// GET POST /api/swaps
import { db, findShift, findUser, nextId } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import { emitToUsers, emitToLocation } from '@/lib/socket'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  let swaps = [...db.swapRequests]
  if (session.role === 'staff') {
    swaps = swaps.filter(s => s.requesterId === session.userId || s.targetStaffId === session.userId)
  }
  // Enrich with shift and user info
  const enriched = swaps.map(s => ({
    ...s,
    shift: findShift(s.shiftId),
    requester: (() => { const u = findUser(s.requesterId); if (!u) return null; const { passwordHash: _, ...rest } = u; return rest })(),
    target: s.targetStaffId ? (() => { const u = findUser(s.targetStaffId!); if (!u) return null; const { passwordHash: _, ...rest } = u; return rest })() : null,
  }))

  return Response.json({ success: true, data: enriched.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) })
}

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, shiftId, targetStaffId, requesterNote } = body

  const shift = findShift(shiftId)
  if (!shift) return Response.json({ success: false, error: 'Shift not found' }, { status: 404 })

  // Staff can only request swaps for their own shifts
  if (session.role === 'staff' && !shift.assignedStaff.includes(session.userId)) {
    return Response.json({ success: false, error: 'Not assigned to this shift' }, { status: 403 })
  }

  // Max 3 pending requests
  const pendingCount = db.swapRequests.filter(s => s.requesterId === session.userId && s.status === 'pending').length
  if (pendingCount >= 3) {
    return Response.json({ success: false, error: 'Maximum 3 pending swap/drop requests allowed' }, { status: 400 })
  }

  const now = new Date()
  const shiftStart = new Date(`${shift.date}T${shift.startTime}:00`)
  const expiresAt = type === 'drop'
    ? new Date(shiftStart.getTime() - 24 * 3600000).toISOString()
    : new Date(now.getTime() + 72 * 3600000).toISOString()

  const swap = {
    id: nextId('swap'),
    type, shiftId,
    requesterId: session.userId,
    targetStaffId: type === 'swap' ? targetStaffId : undefined,
    status: 'pending' as const,
    requesterNote,
    createdAt: now.toISOString(),
    expiresAt,
  }

  db.swapRequests.push(swap)

  const notifBase = { read: false, createdAt: now.toISOString(), relatedSwapId: swap.id, relatedShiftId: shiftId }

  // Notify the target staff member (for swap)
  if (type === 'swap' && targetStaffId) {
    const msg = `${session.name} wants to swap their ${shift.requiredSkill} shift on ${shift.date} with you.`
    db.notifications.push({ id: nextId('notif'), userId: targetStaffId, type: 'swap_requested', title: 'Swap Request', message: msg, ...notifBase })
    emitToUsers([targetStaffId], 'swap_requested', { title: 'Swap Request', message: msg, data: { swapId: swap.id, shiftId } })
  }

  // Notify managers at that location only
  const managers = db.users.filter(u => (u.role === 'manager' || u.role === 'admin') && u.managedLocations.includes(shift.locationId as any))
  for (const mgr of managers) {
    const label = type === 'drop' ? 'Drop Request' : 'Swap Request'
    const msg = `${session.name} submitted a ${type} request for the ${shift.requiredSkill} shift on ${shift.date}.`
    db.notifications.push({ id: nextId('notif'), userId: mgr.id, type: 'swap_requested', title: label, message: msg, ...notifBase })
    emitToUsers([mgr.id], 'swap_requested', { title: label, message: msg, data: { swapId: swap.id, shiftId } })
  }

  // Also send a location-room event so manager dashboards update instantly
  emitToLocation(shift.locationId, 'swap_requested', {
    title: type === 'drop' ? 'Drop Request' : 'Swap Request',
    message: `${session.name} submitted a ${type} request for ${shift.date}.`,
    data: { swapId: swap.id },
  })

  return Response.json({ success: true, data: swap }, { status: 201 })
}
