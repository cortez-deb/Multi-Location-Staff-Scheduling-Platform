import { getSession } from '@/lib/auth'
import { db, findUser } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { StaffProfileClient } from './StaffProfileClient'

export default async function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { id } = await params
  const user = findUser(id)
  if (!user) notFound()

  // Staff can only view own profile
  if (session.role === 'staff' && session.userId !== id) redirect('/dashboard')

  const { passwordHash: _, ...safeUser } = user
  const locations = db.locations
  const availability = { recurring: db.recurringAvailability.filter(a => a.userId === id), exceptions: db.availabilityExceptions.filter(a => a.userId === id) }
  const userShifts = db.shifts.filter(s => s.assignedStaff.includes(id) && s.status === 'published').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)

  return (
    <StaffProfileClient
      session={session}
      user={safeUser}
      locations={locations}
      availability={availability}
      recentShifts={userShifts}
    />
  )
}
