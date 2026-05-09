'use server'
import { findUserByEmail } from '@/lib/db'
import { setSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function loginAction(_prev: { error?: string }, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const user = findUserByEmail(email)
  if (!user || user.passwordHash !== password) {
    return { error: 'Invalid email or password' }
  }
  if (!user.isActive) {
    return { error: 'Your account is inactive' }
  }

  await setSession({
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    managedLocations: user.managedLocations,
    certifiedLocations: user.certifiedLocations,
  })

  redirect('/dashboard')
}
