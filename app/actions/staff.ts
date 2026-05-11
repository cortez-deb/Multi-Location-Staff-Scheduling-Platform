'use server'

import { fetchApi } from '@/lib/api'
import type { Role, Skill, LocationId } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'

export async function addUser(data: {
  name: string
  email: string
  password?: string
  role: Role
  skills: string[]
  certifiedLocations: string[]
}) {
  await requireRole('admin')
  
  try {
    const registerResponse = await fetchApi('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password || 'password123',
        role: data.role,
        skills: data.skills,
        locations: data.certifiedLocations
      })
    })

    revalidatePath('/staff')
    return { success: true, user: registerResponse }
  } catch (error: any) {
    console.error('addUser error:', error.message)
    return { success: false, error: error.message }
  }
}

export async function updateUser(id: string, data: {
  name?: string
  email?: string
  role?: Role
  skills?: string[]
  certifiedLocations?: string[]
  isActive?: boolean
}) {
  await requireRole('admin', 'manager')
  
  try {
    const updatedUser = await fetchApi(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...data,
        locations: data.certifiedLocations,
        skills: data.skills
      })
    })

    revalidatePath('/staff')
    return { success: true, user: updatedUser }
  } catch (error: any) {
    console.error('updateUser error:', error.message)
    return { success: false, error: error.message }
  }
}

export async function assignManager(staffId: string, managerId: string | null) {
  await requireRole('admin')
  
  try {
    const updatedUser = await fetchApi(`/api/users/${staffId}/manager`, {
      method: 'PATCH',
      body: JSON.stringify({ managerId })
    })

    revalidatePath('/staff')
    return { success: true, user: updatedUser }
  } catch (error: any) {
    console.error('assignManager error:', error.message)
    return { success: false, error: error.message }
  }
}
export async function archiveUser(id: string) {
  await requireRole('admin')
  
  try {
    await fetchApi(`/api/users/${id}`, { method: 'DELETE' })
    revalidatePath('/staff')
    return { success: true }
  } catch (error: any) {
    console.error('archiveUser error:', error.message)
    return { success: false, error: error.message }
  }
}
