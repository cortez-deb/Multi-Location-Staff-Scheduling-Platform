// POST /api/auth/login
import { findUserByEmail } from '@/lib/db'
import { setSession } from '@/lib/auth'
import type { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  const user = findUserByEmail(email)
  if (!user || user.passwordHash !== password || !user.isActive) {
    return Response.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
  }
  await setSession({
    userId: user.id, role: user.role, name: user.name, email: user.email,
    managedLocations: user.managedLocations, certifiedLocations: user.certifiedLocations,
  })
  return Response.json({ success: true, user: { id: user.id, name: user.name, role: user.role } })
}
