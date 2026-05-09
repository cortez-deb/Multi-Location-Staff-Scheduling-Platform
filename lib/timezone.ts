// ============================================================
// ShiftSync — Timezone Utilities
// All shifts stored with location timezone context
// ============================================================

import type { Location } from './types'

// ─────────────────────────────────────────────────────────────
// Format a date/time in a specific IANA timezone
// ─────────────────────────────────────────────────────────────
export function formatInTimezone(
  utcDate: Date,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    ...options,
  }).format(utcDate)
}

// ─────────────────────────────────────────────────────────────
// Convert a local date+time string in a given timezone to UTC Date
// e.g. date="2024-03-15", time="22:00", tz="America/Los_Angeles"
// ─────────────────────────────────────────────────────────────
export function localToUTC(date: string, time: string, timezone: string): Date {
  // Build a datetime string that Intl can parse
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)

  // Use a reference date in the target timezone to get the UTC offset
  // We create a Date in UTC that represents midnight of the local date,
  // then adjust for the local time and timezone offset
  const localDateStr = `${date}T${time}:00`

  // Create a date as if it were UTC, then adjust using the offset
  const tempDate = new Date(`${localDateStr}Z`)

  // Get the offset between UTC and the target timezone at that moment
  const tzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  // Binary search to find actual UTC time (handles DST correctly)
  // Start with a rough estimate
  const roughOffset = getTimezoneOffsetMinutes(timezone, tempDate)
  const adjustedDate = new Date(tempDate.getTime() - roughOffset * 60 * 1000)

  return adjustedDate
}

// ─────────────────────────────────────────────────────────────
// Get timezone offset in minutes for a given timezone at a given moment
// ─────────────────────────────────────────────────────────────
export function getTimezoneOffsetMinutes(timezone: string, date: Date): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }))
  return (utcDate.getTime() - tzDate.getTime()) / (1000 * 60)
}

// ─────────────────────────────────────────────────────────────
// Get shift start/end as UTC Date objects
// Handles overnight shifts (endTime < startTime)
// ─────────────────────────────────────────────────────────────
export function getShiftUTCTimes(
  date: string,
  startTime: string,
  endTime: string,
  timezone: string
): { start: Date; end: Date } {
  const start = localToUTC(date, startTime, timezone)

  // If end time is before start time, the shift ends the next day
  const isOvernight = endTime < startTime
  let endDate = date
  if (isOvernight) {
    const d = new Date(date + 'T12:00:00Z')
    d.setUTCDate(d.getUTCDate() + 1)
    endDate = d.toISOString().split('T')[0]
  }
  const end = localToUTC(endDate, endTime, timezone)

  return { start, end }
}

// ─────────────────────────────────────────────────────────────
// Check if two time ranges overlap (inclusive on start, exclusive on end)
// ─────────────────────────────────────────────────────────────
export function doRangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA < endB && startB < endA
}

// ─────────────────────────────────────────────────────────────
// Calculate duration in hours between two dates
// ─────────────────────────────────────────────────────────────
export function durationHours(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
}

// ─────────────────────────────────────────────────────────────
// Format a shift time for display in its location's timezone
// ─────────────────────────────────────────────────────────────
export function formatShiftTime(
  date: string,
  startTime: string,
  endTime: string,
  timezone: string
): string {
  const { start, end } = getShiftUTCTimes(date, startTime, endTime, timezone)
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return `${fmt.format(start)} – ${fmt.format(end)}`
}

// ─────────────────────────────────────────────────────────────
// Format a date for display in a timezone
// ─────────────────────────────────────────────────────────────
export function formatDateInTZ(date: string, timezone: string): string {
  const d = new Date(date + 'T12:00:00Z')
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

// ─────────────────────────────────────────────────────────────
// Get the current date in a given timezone as "YYYY-MM-DD"
// ─────────────────────────────────────────────────────────────
export function getTodayInTimezone(timezone: string): string {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(now)
    .split('-')
  return parts.join('-')
}

// ─────────────────────────────────────────────────────────────
// Get week start (Monday) for a given date string
// ─────────────────────────────────────────────────────────────
export function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day // adjust to Monday
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

// ─────────────────────────────────────────────────────────────
// Get all 7 days of a week starting from weekStart
// ─────────────────────────────────────────────────────────────
export function getWeekDays(weekStart: string): string[] {
  const days: string[] = []
  const d = new Date(weekStart + 'T12:00:00Z')
  for (let i = 0; i < 7; i++) {
    days.push(d.toISOString().split('T')[0])
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return days
}

// ─────────────────────────────────────────────────────────────
// Add days to a date string
// ─────────────────────────────────────────────────────────────
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

// ─────────────────────────────────────────────────────────────
// Get short timezone abbreviation
// ─────────────────────────────────────────────────────────────
export function getTZAbbr(timezone: string): string {
  const map: Record<string, string> = {
    'America/Los_Angeles': 'PT',
    'America/New_York': 'ET',
    'America/Chicago': 'CT',
    'America/Denver': 'MT',
  }
  return map[timezone] ?? timezone
}

// ─────────────────────────────────────────────────────────────
// Check if a shift is currently happening (is "on duty")
// ─────────────────────────────────────────────────────────────
export function isShiftActiveNow(
  date: string,
  startTime: string,
  endTime: string,
  timezone: string
): boolean {
  const now = new Date()
  const { start, end } = getShiftUTCTimes(date, startTime, endTime, timezone)
  return now >= start && now < end
}

// ─────────────────────────────────────────────────────────────
// Format relative time (e.g. "in 2 hours", "3 days ago")
// ─────────────────────────────────────────────────────────────
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffMins = Math.round(diffMs / 60000)
  const diffHours = Math.round(diffMs / 3600000)
  const diffDays = Math.round(diffMs / 86400000)

  if (Math.abs(diffMins) < 1) return 'just now'
  if (Math.abs(diffMins) < 60) {
    return diffMins > 0 ? `in ${diffMins}m` : `${-diffMins}m ago`
  }
  if (Math.abs(diffHours) < 24) {
    return diffHours > 0 ? `in ${diffHours}h` : `${-diffHours}h ago`
  }
  return diffDays > 0 ? `in ${diffDays}d` : `${-diffDays}d ago`
}
