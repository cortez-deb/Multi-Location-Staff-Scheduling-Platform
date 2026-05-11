import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { redirect } from 'next/navigation'
import { NotificationsClient } from './NotificationsClient'

export const metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const db = await getDb()

  const notifs = db.notifications
    .filter(n => n.userId === session.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return <NotificationsClient session={session} initialNotifs={notifs} leaveRequests={db.leaveRequests} />
}
