import { cookies } from 'next/headers';

export class ApiUnauthorizedError extends Error {
  constructor() { super('Unauthorized'); this.name = 'ApiUnauthorizedError'; }
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('shiftsync_session');

  if (!sessionCookie) {
    throw new ApiUnauthorizedError();
  }

  let token = '';
  try {
    const session = JSON.parse(sessionCookie.value);
    token = session.accessToken;
  } catch {
    throw new ApiUnauthorizedError();
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
    cache: 'no-store',
  });

  if (res.status === 401) {
    throw new ApiUnauthorizedError();
  }

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}
