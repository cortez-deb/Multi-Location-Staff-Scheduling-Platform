// ShiftSync — Auth helpers (cookie-based sessions)
import { cookies } from 'next/headers'
import type { Session } from './types'

const COOKIE_NAME = 'shiftsync_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(COOKIE_NAME)?.value
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
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
  ...roles: Session['role'][]
): Promise<Session> {
  const session = await requireSession()
  if (!roles.includes(session.role)) throw new Error('Forbidden')
  return session
}
