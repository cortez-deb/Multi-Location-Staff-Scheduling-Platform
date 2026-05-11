import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getWeekStart, getWeekDays, addDays } from '@/lib/timezone'
import { ScheduleClient } from './ScheduleClient'
import { fetchApi } from '@/lib/api'

export const metadata = { title: 'Schedule' }

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ weekOf?: string; location?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const db = await getDb()

  const params = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const weekOf = params.weekOf ?? today
  const weekStart = getWeekStart(weekOf)
  const weekDays = getWeekDays(weekStart)

  const locationFilter = params.location ?? (session.user.role === 'manager' ? session.managedLocations[0] : null)

  let shifts = db.shifts.filter(s => s.date >= weekDays[0] && s.date <= weekDays[6])

  if (session.user.role === 'manager') {
    shifts = shifts.filter(s => session.managedLocations.includes(s.locationId as any))
  }
  if (session.user.role === 'staff') {
    shifts = shifts.filter(s => s.status === 'published' || s.assignedStaff.includes(session.user.id))
  }
  if (locationFilter) {
    shifts = shifts.filter(s => s.locationId === locationFilter)
  }

  const staffMap = Object.fromEntries(
    db.users.map(u => [u.id, { id: u.id, name: u.name, avatarInitials: u.avatarInitials, avatarColor: u.avatarColor, skills: u.skills }])
  )
  const locations = db.locations.filter(l =>
    session.user.role === 'admin' ? true :
      session.user.role === 'manager' ? (session.managedLocations || []).includes(l.id) :
        (session.certifiedLocations || []).includes(l.id)
  )

  // Ensure manager sees at least one location if they manage any
  const finalLocationFilter = locationFilter || (session.user.role === 'manager' ? session.managedLocations?.[0] : null)

  // Fetch leave requests for the week
  let leaveRequests = []
  try {
    const statusFilter = '' // All statuses or filter as needed
    const userIdFilter = session.user.role === 'staff' ? `&userId=${session.user.id}` : ''
    leaveRequests = await fetchApi(`/api/leave?${userIdFilter}`)
  } catch (err) {
    console.error('Failed to fetch leave requests', err)
  }

  return (
    <ScheduleClient
      session={session}
      shifts={shifts}
      weekDays={weekDays}
      weekStart={weekStart}
      staffMap={staffMap}
      locations={locations}
      selectedLocation={finalLocationFilter}
      today={today}
      skills={db.skills}
      leaveRequests={leaveRequests}
    />
  )
}
