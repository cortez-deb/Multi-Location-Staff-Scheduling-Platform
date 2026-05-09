import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { SwapsClient } from './SwapsClient'

export const metadata = { title: 'Swaps & Drops' }

export default async function SwapsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  let swaps = db.swapRequests.map(s => ({
    ...s,
    shift: db.shifts.find(sh => sh.id === s.shiftId) ?? null,
    requester: (() => { const u = db.users.find(u => u.id === s.requesterId); if (!u) return null; const { passwordHash: _, ...r } = u; return r })(),
    target: s.targetStaffId ? (() => { const u = db.users.find(u => u.id === s.targetStaffId); if (!u) return null; const { passwordHash: _, ...r } = u; return r })() : null,
  }))

  if (session.role === 'staff') {
    swaps = swaps.filter(s => s.requesterId === session.userId || s.targetStaffId === session.userId)
  } else if (session.role === 'manager') {
    swaps = swaps.filter(s => s.shift && session.managedLocations.includes(s.shift.locationId as any))
  }

  swaps.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const locations = db.locations
  const allStaff = db.users.filter(u => u.role === 'staff').map(({ passwordHash: _, ...u }) => u)

  return <SwapsClient session={session} swaps={swaps} locations={locations} allStaff={allStaff} />
}
