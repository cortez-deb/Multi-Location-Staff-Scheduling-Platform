import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db, findUser } from '@/lib/db'
import { SettingsClient } from './SettingsClient'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const user = findUser(session.userId)
  if (!user) redirect('/login')

  let managerName = 'None'
  if (user.role === 'manager') {
    managerName = 'Jordan Rivera'
  } else if (user.role === 'staff') {
    const manager = db.users.find(u => u.role === 'manager' && u.managedLocations.some(l => user.certifiedLocations.includes(l)))
    if (manager) managerName = manager.name
  } else if (user.role === 'admin') {
    managerName = 'N/A'
  }

  const { passwordHash: _, ...safeUser } = user
  return <SettingsClient user={{...safeUser, managerName}} />
}
