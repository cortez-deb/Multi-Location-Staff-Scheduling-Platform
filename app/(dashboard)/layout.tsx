import { getSession } from '@/lib/auth'
import { DashboardShell } from './DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  // Middleware guarantees session exists for this route group;
  // the null return is a safety-net that should never be reached.
  if (!session) return null
  return <DashboardShell session={session}>{children}</DashboardShell>
}
