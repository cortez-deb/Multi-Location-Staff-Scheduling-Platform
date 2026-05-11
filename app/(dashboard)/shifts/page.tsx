import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { redirect } from 'next/navigation'
import { ShiftsClient } from './ShiftsClient'

export const metadata = { title: 'Shifts' }

export default async function ShiftsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const db = await getDb()

  let shifts = [...db.shifts]
  if (session.user.role === 'manager') shifts = shifts.filter(s => session.managedLocations.includes(s.locationId as any))
  if (session.user.role === 'staff') shifts = shifts.filter(s => s.status === 'published' || s.assignedStaff.includes(session.user.id))

  shifts.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))

  const staffMap = Object.fromEntries(db.users.map(u => [u.id, { id: u.id, name: u.name, avatarInitials: u.avatarInitials, avatarColor: u.avatarColor }]))
  const locations = db.locations

  return <ShiftsClient session={session} shifts={shifts} staffMap={staffMap} locations={locations} skills={db.skills} />
}
