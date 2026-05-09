// ShiftSync — Constraint Engine
import type { ConstraintCheckResult, ConstraintViolation, Shift, User, Location, RecurringAvailability, AvailabilityException } from './types'
import { getShiftUTCTimes, durationHours, doRangesOverlap } from './timezone'

interface DbContext {
  locations: Location[];
  shifts: Shift[];
  users: User[];
  recurringAvailability: RecurringAvailability[];
  availabilityExceptions: AvailabilityException[];
}

function getLocation(locationId: string, db: DbContext) {
  return db.locations.find(l => l.id === locationId)!
}

function getUserWeeklyHours(userId: string, weekShifts: Shift[], db: DbContext): number {
  return weekShifts
    .filter(s => s.assignedStaff.includes(userId))
    .reduce((sum, s) => {
      const loc = getLocation(s.locationId, db)
      const { start, end } = getShiftUTCTimes(s.date, s.startTime, s.endTime, loc.timezone)
      return sum + durationHours(start, end)
    }, 0)
}

function getWeekShifts(date: string, db: DbContext): Shift[] {
  const d = new Date(date + 'T12:00:00Z')
  const day = d.getUTCDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const mon = monday.toISOString().split('T')[0]
  const sun = sunday.toISOString().split('T')[0]
  return db.shifts.filter(s => s.date >= mon && s.date <= sun && s.status === 'published')
}

export function checkAssignmentConstraints(
  shift: Shift,
  user: User,
  db: DbContext,
  ignoreShiftId?: string // exclude a shift (e.g. during swap)
): ConstraintCheckResult {
  const violations: ConstraintViolation[] = []
  const warnings: ConstraintViolation[] = []
  const loc = getLocation(shift.locationId, db)
  const { start: newStart, end: newEnd } = getShiftUTCTimes(
    shift.date, shift.startTime, shift.endTime, loc.timezone
  )

  // 1. Skill check
  if (!user.skills.includes(shift.requiredSkill)) {
    const alts = db.users.filter(u =>
      u.id !== user.id && u.skills.includes(shift.requiredSkill) &&
      u.certifiedLocations.includes(shift.locationId as any)
    ).slice(0, 3).map(u => ({ userId: u.id, name: u.name, reason: `Has ${shift.requiredSkill} skill` }))

    violations.push({
      ruleId: 'skill_mismatch',
      severity: 'error',
      message: `${user.name} lacks required skill`,
      detail: `This shift requires "${shift.requiredSkill}" but ${user.name} has: ${user.skills.join(', ')}`,
      suggestions: alts,
      overrideAllowed: false,
    })
  }

  // 2. Location certification
  if (!user.certifiedLocations.includes(shift.locationId as any)) {
    violations.push({
      ruleId: 'location_cert',
      severity: 'error',
      message: `${user.name} is not certified for this location`,
      detail: `${user.name} is certified for: ${user.certifiedLocations.join(', ')}`,
      suggestions: [],
      overrideAllowed: false,
    })
  }

  // 3. Double-booking & 10hr rest
  const userShifts = db.shifts.filter(s =>
    s.id !== shift.id && s.id !== ignoreShiftId &&
    s.assignedStaff.includes(user.id)
  )

  for (const existing of userShifts) {
    const eLoc = getLocation(existing.locationId, db)
    const { start: eStart, end: eEnd } = getShiftUTCTimes(
      existing.date, existing.startTime, existing.endTime, eLoc.timezone
    )

    if (doRangesOverlap(newStart, newEnd, eStart, eEnd)) {
      violations.push({
        ruleId: 'double_booking',
        severity: 'error',
        message: `${user.name} is already scheduled during this time`,
        detail: `Conflicts with shift at ${eLoc.shortName} on ${existing.date} ${existing.startTime}–${existing.endTime}`,
        suggestions: [],
        overrideAllowed: false,
      })
    } else {
      const gapAfter = (newStart.getTime() - eEnd.getTime()) / 3600000
      const gapBefore = (eStart.getTime() - newEnd.getTime()) / 3600000
      if ((gapAfter >= 0 && gapAfter < 10) || (gapBefore >= 0 && gapBefore < 10)) {
        violations.push({
          ruleId: 'min_rest',
          severity: 'error',
          message: `${user.name} would have less than 10 hours rest`,
          detail: `Minimum 10 hours required between shifts`,
          suggestions: [],
          overrideAllowed: false,
        })
      }
    }
  }

  // 4. Daily hours
  const dayShifts = db.shifts.filter(s =>
    s.date === shift.date && s.assignedStaff.includes(user.id) && s.id !== shift.id
  )
  const dayHours = dayShifts.reduce((sum, s) => {
    const l = getLocation(s.locationId, db)
    const { start, end } = getShiftUTCTimes(s.date, s.startTime, s.endTime, l.timezone)
    return sum + durationHours(start, end)
  }, 0) + durationHours(newStart, newEnd)

  if (dayHours > 12) {
    violations.push({
      ruleId: 'daily_hours_max',
      severity: 'error',
      message: `${user.name} would exceed 12 hours in a day`,
      detail: `Projected daily hours: ${dayHours.toFixed(1)}h (max 12h)`,
      suggestions: [],
      overrideAllowed: false,
    })
  } else if (dayHours > 8) {
    warnings.push({
      ruleId: 'daily_hours_warn',
      severity: 'warning',
      message: `${user.name} will work more than 8 hours today`,
      detail: `Projected daily hours: ${dayHours.toFixed(1)}h`,
      suggestions: [],
      overrideAllowed: true,
    })
  }

  // 5. Weekly hours
  const weekShifts = getWeekShifts(shift.date, db)
  const currentWeekHours = getUserWeeklyHours(user.id, weekShifts, db)
  const newShiftHours = durationHours(newStart, newEnd)
  const projectedHours = currentWeekHours + newShiftHours

  if (projectedHours > 40) {
    warnings.push({
      ruleId: 'weekly_overtime',
      severity: 'warning',
      message: `${user.name} will be in overtime this week`,
      detail: `Projected: ${projectedHours.toFixed(1)}h (${(projectedHours - 40).toFixed(1)}h overtime)`,
      suggestions: [],
      overrideAllowed: true,
    })
  } else if (projectedHours >= 35) {
    warnings.push({
      ruleId: 'weekly_hours_warn',
      severity: 'warning',
      message: `${user.name} is approaching 40 hours this week`,
      detail: `Projected: ${projectedHours.toFixed(1)}h / 40h`,
      suggestions: [],
      overrideAllowed: true,
    })
  }

  // 6. Consecutive days
  const workedDays: Set<string> = new Set()
  for (const s of db.shifts) {
    if (s.assignedStaff.includes(user.id) && s.id !== shift.id) {
      workedDays.add(s.date)
    }
  }
  workedDays.add(shift.date)
  // Check streak around the shift date
  let streak = 0
  const shiftD = new Date(shift.date + 'T12:00:00Z')
  for (let i = -3; i <= 3; i++) {
    const d = new Date(shiftD)
    d.setUTCDate(shiftD.getUTCDate() + i)
    if (workedDays.has(d.toISOString().split('T')[0])) streak++
    else streak = 0
    if (streak >= 7) {
      violations.push({
        ruleId: 'seven_consecutive_days',
        severity: 'override_required',
        message: `${user.name} would work 7 consecutive days`,
        detail: 'Manager override with documented reason required',
        suggestions: [],
        overrideAllowed: true,
      })
      break
    } else if (streak >= 6) {
      warnings.push({
        ruleId: 'six_consecutive_days',
        severity: 'warning',
        message: `${user.name} would work 6 consecutive days`,
        detail: 'Consider giving this employee a day off',
        suggestions: [],
        overrideAllowed: true,
      })
    }
  }

  // 7. Availability check
  const shiftDow = new Date(shift.date + 'T12:00:00Z').getUTCDay()
  const avail = db.recurringAvailability.find(
    a => a.userId === user.id && a.dayOfWeek === shiftDow && a.available
  )
  const exception = db.availabilityExceptions.find(
    a => a.userId === user.id && a.date === shift.date
  )
  if (exception && !exception.available) {
    violations.push({
      ruleId: 'availability_exception',
      severity: 'error',
      message: `${user.name} marked as unavailable on this date`,
      detail: exception.reason ?? 'Staff has a one-off unavailability exception',
      suggestions: [],
      overrideAllowed: true,
    })
  } else if (!avail && !exception) {
    warnings.push({
      ruleId: 'no_availability',
      severity: 'warning',
      message: `${user.name} has no availability set for this day`,
      detail: 'No recurring availability found. Verify with staff before assigning.',
      suggestions: [],
      overrideAllowed: true,
    })
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  }
}
