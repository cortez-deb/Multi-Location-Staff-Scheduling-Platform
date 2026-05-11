import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDb, findUser } from '@/lib/db'
import { SettingsClient } from './SettingsClient'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = await findUser(session.user.id)
  if (!user) redirect('/login')

  const db = await getDb()

  let managerName = 'None'
  if (user.role === 'admin') {
    managerName = 'N/A'
  } else if (user.manager) {
    managerName = user.manager.name
  } else if (user.role === 'manager') {
    // Managers report to Admin by default in this system
    managerName = 'Admin'
  }

  const { passwordHash: _, ...safeUser } = user
  return <SettingsClient user={{ ...safeUser, managerName }} allSkills={db.skills} />
}
