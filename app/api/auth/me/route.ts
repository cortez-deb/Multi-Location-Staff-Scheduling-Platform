// GET /api/auth/me
import { getSession } from '@/lib/auth'
import { findUser } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const user = findUser(session.userId)
  if (!user) return Response.json({ success: false, error: 'User not found' }, { status: 404 })
  const { passwordHash: _, ...safeUser } = user
  return Response.json({ success: true, data: safeUser })
}
