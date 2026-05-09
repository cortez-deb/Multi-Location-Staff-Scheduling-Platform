// GET /api/analytics  — hours, fairness, overtime projections
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import { getShiftUTCTimes, durationHours } from '@/lib/timezone'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ?? new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const to = searchParams.get('to') ?? new Date().toISOString().split('T')[0]
  const locationId = searchParams.get('locationId')

  let shifts = db.shifts.filter(s => s.date >= from && s.date <= to && s.status === 'published')
  if (locationId) shifts = shifts.filter(s => s.locationId === locationId)
  if (session.role === 'manager') shifts = shifts.filter(s => session.managedLocations.includes(s.locationId as any))

  const staffMap: Record<string, { totalHours: number; premiumShifts: number; totalShifts: number }> = {}

  for (const shift of shifts) {
    const loc = db.locations.find(l => l.id === shift.locationId)!
    const { start, end } = getShiftUTCTimes(shift.date, shift.startTime, shift.endTime, loc.timezone)
    const hrs = durationHours(start, end)

    for (const staffId of shift.assignedStaff) {
      if (!staffMap[staffId]) staffMap[staffId] = { totalHours: 0, premiumShifts: 0, totalShifts: 0 }
      staffMap[staffId].totalHours += hrs
      staffMap[staffId].totalShifts += 1
      if (shift.isPremium) staffMap[staffId].premiumShifts += 1
    }
  }

  const summaries = Object.entries(staffMap).map(([userId, data]) => {
    const user = db.users.find(u => u.id === userId)
    const regularHours = Math.min(data.totalHours, 40)
    const overtimeHours = Math.max(0, data.totalHours - 40)
    const variance = data.totalHours - (user?.desiredHoursPerWeek ?? 40)
    const fairnessScore = Math.max(0, Math.min(100, 100 - Math.abs(variance) * 3))
    return {
      userId, name: user?.name ?? userId,
      totalHours: Math.round(data.totalHours * 10) / 10,
      regularHours: Math.round(regularHours * 10) / 10,
      overtimeHours: Math.round(overtimeHours * 10) / 10,
      premiumShifts: data.premiumShifts,
      totalShifts: data.totalShifts,
      desiredHours: user?.desiredHoursPerWeek ?? 40,
      variance: Math.round(variance * 10) / 10,
      fairnessScore: Math.round(fairnessScore),
    }
  }).sort((a, b) => b.totalHours - a.totalHours)

  // Overtime projections for current week
  const today = new Date().toISOString().split('T')[0]
  const weekShifts = db.shifts.filter(s => {
    const d = new Date(today + 'T12:00:00Z')
    const dow = d.getUTCDay(); const mon = new Date(d); mon.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow))
    const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6)
    return s.date >= mon.toISOString().split('T')[0] && s.date <= sun.toISOString().split('T')[0]
  })

  const overtimeProjections = db.users.filter(u => u.role === 'staff').map(u => {
    const userWeekShifts = weekShifts.filter(s => s.assignedStaff.includes(u.id))
    const currentHrs = userWeekShifts.filter(s => s.date <= today).reduce((sum, s) => {
      const loc = db.locations.find(l => l.id === s.locationId)!
      const { start, end } = getShiftUTCTimes(s.date, s.startTime, s.endTime, loc.timezone)
      return sum + durationHours(start, end)
    }, 0)
    const projectedHrs = userWeekShifts.reduce((sum, s) => {
      const loc = db.locations.find(l => l.id === s.locationId)!
      const { start, end } = getShiftUTCTimes(s.date, s.startTime, s.endTime, loc.timezone)
      return sum + durationHours(start, end)
    }, 0)
    return {
      userId: u.id, name: u.name,
      currentWeekHours: Math.round(currentHrs * 10) / 10,
      projectedHours: Math.round(projectedHrs * 10) / 10,
      overtimeHours: Math.round(Math.max(0, projectedHrs - 40) * 10) / 10,
      overtimeCost: Math.round(Math.max(0, projectedHrs - 40) * 22.5 * 100) / 100, // 1.5x $15/hr
      triggeringShiftIds: userWeekShifts.filter(s => s.date > today).map(s => s.id),
    }
  }).filter(p => p.projectedHours > 0)

  const totalPremium = summaries.reduce((s, u) => s + u.premiumShifts, 0)
  const avgPremium = summaries.length ? totalPremium / summaries.length : 0
  const overallFairness = summaries.length
    ? Math.round(summaries.reduce((s, u) => s + u.fairnessScore, 0) / summaries.length)
    : 100

  return Response.json({
    success: true,
    data: { period: { from, to }, staffSummaries: summaries, overtimeProjections, overallFairnessScore: overallFairness, avgPremiumShifts: Math.round(avgPremium * 10) / 10 },
  })
}
