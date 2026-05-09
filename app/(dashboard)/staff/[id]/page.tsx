import { getSession } from '@/lib/auth'
import { getDb, findUser } from '@/lib/db'
import { fetchApi } from '@/lib/api'
import { redirect, notFound } from 'next/navigation'
import { StaffProfileClient } from './StaffProfileClient'

export default async function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const db = await getDb()
  const { id } = await params
  const user = await findUser(id)
  if (!user) notFound()

  // Staff can only view own profile
  if (session.user.role === 'staff' && session.user.id !== id) redirect('/dashboard')

  const { passwordHash: _, ...safeUser } = user
  const locations = db.locations
  
  const availabilityRes = await fetchApi(`/api/users/${id}/availability`)
  const availability = { 
    recurring: availabilityRes.availabilities || [], 
    exceptions: availabilityRes.exceptions || [] 
  }
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
