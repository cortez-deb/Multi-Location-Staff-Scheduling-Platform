'use client'

export async function fetchClient(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(endpoint, options)
  
  if (res.status === 401) {
    // If we get a 401 on the client, the token is expired or invalid
    window.location.href = '/logout'
    return null
  }
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.message || `API Error: ${res.status}`)
  }
  
  if (res.status === 204) return null
  return res.json()
}
