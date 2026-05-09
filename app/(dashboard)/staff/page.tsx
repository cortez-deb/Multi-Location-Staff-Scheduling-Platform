import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { StaffClient } from './StaffClient'

export const metadata = { title: 'Staff' }

export default async function StaffPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'staff') redirect('/dashboard')

  const users = db.users
    .filter(u => u.role !== 'admin' || session.role === 'admin')
    .map(({ passwordHash: _, ...u }) => u)
    .filter(u =>
      session.role === 'admin' ? true :
      u.certifiedLocations.some(l => session.managedLocations.includes(l as any)) ||
      u.managedLocations.some(l => session.managedLocations.includes(l as any))
    )

  const locations = db.locations

  // Weekly hours per staff
  const today = new Date().toISOString().split('T')[0]
  const d = new Date(); const dow = d.getUTCDay()
  const mon = new Date(d); mon.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow))
  const weekStart = mon.toISOString().split('T')[0]
  const weekEnd = new Date(mon.getTime() + 6 * 86400000).toISOString().split('T')[0]
  const weekShifts = db.shifts.filter(s => s.date >= weekStart && s.date <= weekEnd && s.status === 'published')

  const weeklyHours: Record<string, number> = {}
  for (const s of weekShifts) {
    for (const sid of s.assignedStaff) {
      weeklyHours[sid] = (weeklyHours[sid] ?? 0) + 1 // approximate
    }
  }

  return <StaffClient session={session} users={users} locations={locations} weeklyHours={weeklyHours} />
}
