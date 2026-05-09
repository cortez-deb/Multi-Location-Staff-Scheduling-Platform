// GET /api/notifications  PUT /api/notifications (mark read)
import { db, nextId } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import type { NextRequest } from 'next/server'

export async function GET() {
  const session = await requireSession().catch(() => null)
  if (!session) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const notifs = db.notifications
    .filter(n => n.userId === session.userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return Response.json({ success: true, data: notifs, unread: notifs.filter(n => !n.read).length })
}

export async function PUT(req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { ids, markAll } = await req.json()

  db.notifications.forEach(n => {
    if (n.userId !== session.userId) return
    if (markAll || ids?.includes(n.id)) n.read = true
  })

  return Response.json({ success: true })
}
