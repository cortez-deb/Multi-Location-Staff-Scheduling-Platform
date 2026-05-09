// ShiftSync — Auth helpers (cookie-based sessions)
import { cookies } from 'next/headers'
import type { Session } from './types'

const COOKIE_NAME = 'shiftsync_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('shiftsync_session')
  if (!sessionCookie) return null

  try {
    const session = JSON.parse(sessionCookie.value) as Session
    if (!session || !session.user) {
      return null
    }
    return {
      ...session,
      managedLocations: session.managedLocations || [],
      certifiedLocations: session.certifiedLocations || []
    }
  } catch (err) {
    return null
  }
}

export async function setSession(session: Session): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session
}

export async function requireRole(
  ...roles: Session['user']['role'][]
): Promise<Session> {
  const session = await requireSession()
  if (!roles.includes(session.user.role)) throw new Error('Forbidden')
  return session
}
