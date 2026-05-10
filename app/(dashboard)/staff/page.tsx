import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { redirect } from 'next/navigation'
import { StaffClient } from './StaffClient'
import { fetchApi } from '@/lib/api'

export const metadata = { title: 'Staff' }

export default async function StaffPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const db = await getDb()
  if (session.user.role === 'staff') redirect('/dashboard')

  // Fetch users from the real API to support reporting relationships
  let users = []
  try {
    const apiUsers = await fetchApi('/api/users')
    // Normalize data: ensure skills and locations are arrays of IDs for compatibility with StaffClient
    users = apiUsers.map((u: any) => ({
      ...u,
      skills: (u.skills || []).map((s: any) => s.id || s),
      certifiedLocations: (u.certifiedLocations || []).map((l: any) => l.id || l),
      managedLocations: (u.managedLocations || []).map((l: any) => l.id || l),
      desiredHoursPerWeek: u.desiredHours || 40, // Map backend field name to frontend expectation
      avatarInitials: u.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
      avatarColor: stringToColor(u.id)
    }))
  } catch (err) {
    console.error('Failed to fetch users from API', err)
    // Fallback to local db if API fails (not ideal but avoids crash)
    users = db.users
      .filter(u => u.role !== 'admin' || session.user.role === 'admin')
      .map(({ passwordHash: _, ...u }) => u)
  }

  function stringToColor(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  }

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

  // Fetch from the real API for the Add User modal
  let apiLocations = []
  let apiSkills = []
  try {
    apiLocations = await fetchApi('/api/locations')
    apiSkills = await fetchApi('/api/skills')
  } catch (err) {
    console.error('Failed to fetch API locations or skills', err)
  }

  return <StaffClient session={session} users={users} locations={locations} weeklyHours={weeklyHours} apiLocations={apiLocations} apiSkills={apiSkills} />
}
