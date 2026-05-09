import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { AnalyticsClient } from './AnalyticsClient'
import { getShiftUTCTimes, durationHours } from '@/lib/timezone'

export const metadata = { title: 'Analytics' }

export default async function AnalyticsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const d = new Date(); const dow = d.getUTCDay()
  const mon = new Date(d); mon.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow))
  const weekStart = mon.toISOString().split('T')[0]
  const weekEnd = new Date(mon.getTime() + 6 * 86400000).toISOString().split('T')[0]

  let shifts = db.shifts.filter(s => s.status === 'published' && s.date >= weekStart && s.date <= weekEnd)
  if (session.role === 'manager') shifts = shifts.filter(s => session.managedLocations.includes(s.locationId as any))

  const staffUsers = db.users.filter(u => u.role === 'staff' && (
    session.role === 'admin' ? true :
    session.role === 'manager' ? u.certifiedLocations.some(l => session.managedLocations.includes(l as any)) :
    u.id === session.userId
  ))

  const summaries = staffUsers.map(u => {
    const userShifts = shifts.filter(s => s.assignedStaff.includes(u.id))
    const totalHours = userShifts.reduce((sum, s) => {
      const loc = db.locations.find(l => l.id === s.locationId)!
      const { start, end } = getShiftUTCTimes(s.date, s.startTime, s.endTime, loc.timezone)
      return sum + durationHours(start, end)
    }, 0)
    const premiumShifts = userShifts.filter(s => s.isPremium).length
    const overtimeHours = Math.max(0, totalHours - 40)
    const variance = totalHours - u.desiredHoursPerWeek
    const fairnessScore = Math.max(0, Math.min(100, 100 - Math.abs(variance) * 3))
    return {
      userId: u.id, name: u.name, avatarInitials: u.avatarInitials, avatarColor: u.avatarColor,
      totalHours: Math.round(totalHours * 10) / 10,
      regularHours: Math.round(Math.min(totalHours, 40) * 10) / 10,
      overtimeHours: Math.round(overtimeHours * 10) / 10,
      premiumShifts, totalShifts: userShifts.length,
      desiredHours: u.desiredHoursPerWeek,
      variance: Math.round(variance * 10) / 10,
      fairnessScore: Math.round(fairnessScore),
    }
  }).sort((a, b) => b.totalHours - a.totalHours)

  const overallFairness = summaries.length
    ? Math.round(summaries.reduce((s, u) => s + u.fairnessScore, 0) / summaries.length) : 100

  const locations = db.locations.filter(l =>
    session.role === 'admin' ? true : session.managedLocations.includes(l.id)
  )

  return (
    <AnalyticsClient
      session={session}
      summaries={summaries}
      overallFairness={overallFairness}
      weekStart={weekStart}
      weekEnd={weekEnd}
      locations={locations}
    />
  )
}
