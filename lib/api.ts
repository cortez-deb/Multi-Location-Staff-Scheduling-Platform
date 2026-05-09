import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('shiftsync_session');
  
  if (!sessionCookie) {
    redirect('/login');
  }

  let token = '';
  try {
    const session = JSON.parse(sessionCookie.value);
    token = session.accessToken;
  } catch (e) {
    redirect('/login');
  }

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${backendUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    // Optionally handle refresh tokens here, or just redirect
    redirect('/login');
  }

  if (!res.ok) {
    throw new Error(`API Error: ${res.statusText}`);
  }

  // Handle empty responses
  if (res.status === 204) {
    return null;
  }

  return res.json();
}
