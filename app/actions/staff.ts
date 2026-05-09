'use server'

import { fetchApi } from '@/lib/api'
import type { Role, Skill, LocationId } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'

export async function addUser(data: {
  name: string
  email: string
  role: Role
  skills: Skill[]
  certifiedLocations: LocationId[]
}) {
  await requireRole('admin')
  
  try {
    const newUser = await fetchApi('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: 'password123', // Demo
        role: data.role,
        skills: data.skills,
        locations: data.certifiedLocations,
      })
    })

    revalidatePath('/staff')
    return { success: true, user: newUser }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateUser(id: string, data: {
  name?: string
  email?: string
  role?: Role
  skills?: Skill[]
  certifiedLocations?: LocationId[]
  isActive?: boolean
}) {
  await requireRole('admin')
  
  try {
    const updatedUser = await fetchApi(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...data,
        locations: data.certifiedLocations
      })
    })

    revalidatePath('/staff')
    return { success: true, user: updatedUser }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
