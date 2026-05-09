import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getWeekStart, getWeekDays, addDays } from '@/lib/timezone'
import { ScheduleClient } from './ScheduleClient'

export const metadata = { title: 'Schedule' }

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ weekOf?: string; location?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const params = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const weekOf = params.weekOf ?? today
  const weekStart = getWeekStart(weekOf)
  const weekDays = getWeekDays(weekStart)

  const locationFilter = params.location ?? (session.role === 'manager' ? session.managedLocations[0] : null)

  let shifts = db.shifts.filter(s => s.date >= weekDays[0] && s.date <= weekDays[6])

  if (session.role === 'manager') {
    shifts = shifts.filter(s => session.managedLocations.includes(s.locationId as any))
  }
  if (session.role === 'staff') {
    shifts = shifts.filter(s => s.status === 'published' || s.assignedStaff.includes(session.userId))
  }
  if (locationFilter) {
    shifts = shifts.filter(s => s.locationId === locationFilter)
  }

  const staffMap = Object.fromEntries(
    db.users.map(u => [u.id, { id: u.id, name: u.name, avatarInitials: u.avatarInitials, avatarColor: u.avatarColor, skills: u.skills }])
  )
  const locations = db.locations.filter(l =>
    session.role === 'admin' ? true :
    session.role === 'manager' ? session.managedLocations.includes(l.id) :
    session.certifiedLocations.includes(l.id)
  )

  return (
    <ScheduleClient
      session={session}
      shifts={shifts}
      weekDays={weekDays}
      weekStart={weekStart}
      staffMap={staffMap}
      locations={locations}
      selectedLocation={locationFilter}
      today={today}
    />
  )
}
