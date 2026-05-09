'use server'
import { setSession, clearSession } from '@/lib/auth'

export async function loginAction(_prev: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const res = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const data = await res.json();
      return { error: data.message || 'Invalid email or password' };
    }

    const data = await res.json();

    await setSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
      managedLocations: data.managedLocations || [],
      certifiedLocations: data.certifiedLocations || [],
    });

  } catch (error) {
    return { error: 'Failed to connect to authentication server' };
  }

  // Return success — the client will do window.location.href = '/dashboard'
  // so the browser issues a full navigation after the cookie is committed.
  return { success: true }
}

export async function logoutAction() {
  await clearSession()
}
