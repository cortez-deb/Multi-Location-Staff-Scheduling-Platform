'use server'
import { setSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function loginAction(_prev: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const res = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const data = await res.json();
      return { error: data.message || 'Invalid email or password' };
    }

    const data = await res.json();
    
    // Store tokens and basic user info in cookies
    await setSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user
    });

  } catch (error) {
    return { error: 'Failed to connect to authentication server' };
  }

  redirect('/dashboard')
}
