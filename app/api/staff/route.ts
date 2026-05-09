// GET /api/staff  — staff directory
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const locationId = searchParams.get('locationId')
  const skill = searchParams.get('skill')

  let users = db.users.map(({ passwordHash: _, ...u }) => u)

  if (session.role === 'manager') {
    users = users.filter(u =>
      u.certifiedLocations.some(l => session.managedLocations.includes(l as any)) ||
      u.managedLocations.some(l => session.managedLocations.includes(l as any))
    )
  }

  if (locationId) users = users.filter(u => u.certifiedLocations.includes(locationId as any))
  if (skill) users = users.filter(u => u.skills.includes(skill as any))

  return Response.json({ success: true, data: users })
}
