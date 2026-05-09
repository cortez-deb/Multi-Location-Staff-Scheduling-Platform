// POST /api/auth/logout
import { clearSession } from '@/lib/auth'

export async function POST() {
  await clearSession()
  return Response.json({ success: true })
}
