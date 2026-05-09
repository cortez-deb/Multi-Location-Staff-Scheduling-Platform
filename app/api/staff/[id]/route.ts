// GET PUT /api/staff/[id]
import { db, findUser } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import type { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/staff/[id]'>) {
  const session = await requireSession().catch(() => null)
  if (!session) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const user = findUser(id)
  if (!user) return Response.json({ success: false, error: 'Not found' }, { status: 404 })
  const { passwordHash: _, ...safe } = user
  return Response.json({ success: true, data: safe })
}

export async function PUT(req: NextRequest, ctx: RouteContext<'/api/staff/[id]'>) {
  const session = await requireSession().catch(() => null)
  if (!session) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params

  // Staff can only update themselves (prefs/desired hours); admins/managers can update more
  if (session.role === 'staff' && session.userId !== id) {
    return Response.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const user = findUser(id)
  if (!user) return Response.json({ success: false, error: 'Not found' }, { status: 404 })
  const before = { ...user }
  const body = await req.json()

  const staffAllowed = ['desiredHoursPerWeek', 'notificationPrefs', 'phone']
  const adminAllowed = [...staffAllowed, 'skills', 'certifiedLocations', 'managedLocations', 'isActive', 'maxHoursPerWeek']
  const allowed = session.role === 'staff' ? staffAllowed : adminAllowed

  for (const key of allowed) {
    if (key in body) (user as any)[key] = body[key]
  }

  writeAuditLog({ entityType: 'user', entityId: user.id, action: 'updated', before, after: { ...user }, performedBy: session.userId })
  const { passwordHash: _, ...safe } = user
  return Response.json({ success: true, data: safe })
}
