import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { isShiftActiveNow, getTodayInTimezone, getShiftUTCTimes, durationHours } from '@/lib/timezone'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const db = await getDb()

  const today = new Date().toISOString().split('T')[0]

  // On-duty now: shifts active at this moment
  const onDutyNow = db.shifts
    .filter(s => s.status === 'published' && s.assignedStaff.length > 0)
    .filter(s => {
      const loc = db.locations.find(l => l.id === s.locationId)!
      return isShiftActiveNow(s.date, s.startTime, s.endTime, loc.timezone)
    })
    .map(s => {
      const loc = db.locations.find(l => l.id === s.locationId)!
      return {
        ...s,
        location: loc,
        staff: s.assignedStaff.map(sid => {
          const u = db.users.find(u => u.id === sid)
          return u ? { id: u.id, name: u.name, avatarInitials: u.avatarInitials, avatarColor: u.avatarColor, skills: u.skills } : null
        }).filter(Boolean),
      }
    })

  // Today's shifts
  const todayShifts = db.shifts.filter(s => s.date === today && s.status === 'published')

  // Weekly hours per staff (this week)
  const d = new Date()
  const dow = d.getUTCDay()
  const mon = new Date(d); mon.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow))
  const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6)
  const monStr = mon.toISOString().split('T')[0]
  const sunStr = sun.toISOString().split('T')[0]

  const weekShifts = db.shifts.filter(s => s.date >= monStr && s.date <= sunStr && s.status === 'published')
  const weeklyHours: Record<string, number> = {}
  for (const s of weekShifts) {
    const loc = db.locations.find(l => l.id === s.locationId)!
    const { start, end } = getShiftUTCTimes(s.date, s.startTime, s.endTime, loc.timezone)
    const hrs = durationHours(start, end)
    for (const sid of s.assignedStaff) {
      weeklyHours[sid] = (weeklyHours[sid] ?? 0) + hrs
    }
  }

  // Overtime warnings
  const overtimeWarnings = Object.entries(weeklyHours)
    .filter(([, h]) => h >= 35)
    .map(([uid, h]) => {
      const u = db.users.find(u => u.id === uid)
      return { userId: uid, name: u?.name ?? uid, hours: Math.round(h * 10) / 10, isOvertime: h > 40 }
    })
    .sort((a, b) => b.hours - a.hours)

  // Pending swaps count
  const pendingSwaps = db.swapRequests.filter(s => s.status === 'pending' || s.status === 'accepted').length

  // Stats
  const stats = {
    totalStaff: db.users.filter(u => u.role === 'staff').length,
    shiftsToday: todayShifts.length,
    staffOnDuty: onDutyNow.reduce((sum, s) => sum + (s.staff?.length ?? 0), 0),
    pendingSwaps,
    draftShifts: db.shifts.filter(s => s.status === 'draft').length,
    overtimeCount: overtimeWarnings.filter(w => w.isOvertime).length,
  }

  const locations = db.locations

  return (
    <DashboardClient
      session={session}
      onDutyNow={onDutyNow}
      stats={stats}
      overtimeWarnings={overtimeWarnings}
      locations={locations}
      today={today}
    />
  )
}
