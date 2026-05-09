import { getSession } from '@/lib/auth'
import { db, findShift } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { getEntityAuditLogs } from '@/lib/audit'
import { ShiftDetailClient } from './ShiftDetailClient'

export default async function ShiftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { id } = await params
  const shift = findShift(id)
  if (!shift) notFound()

  const location = db.locations.find(l => l.id === shift.locationId)!
  const allStaff = db.users.filter(u => u.role === 'staff' || u.role === 'manager').map(u => {
    const { passwordHash: _, ...s } = u; return s
  })
  const auditLogs = getEntityAuditLogs('shift', id)
  const performerMap = Object.fromEntries(db.users.map(u => [u.id, u.name]))

  return (
    <ShiftDetailClient
      session={session}
      shift={shift}
      location={location}
      allStaff={allStaff}
      auditLogs={auditLogs}
      performerMap={performerMap}
    />
  )
}
