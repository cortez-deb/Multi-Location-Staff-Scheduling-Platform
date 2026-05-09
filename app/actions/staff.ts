'use server'

import { db, nextId } from '@/lib/db'
import type { User, Role, Skill, LocationId } from '@/lib/types'
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
  const newUser: User = {
    id: nextId('user'),
    name: data.name,
    email: data.email,
    passwordHash: 'default123', // Demo purposes
    role: data.role,
    avatarInitials: data.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
    avatarColor: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'), // Random hex color
    skills: data.skills,
    certifiedLocations: data.certifiedLocations,
    managedLocations: data.role === 'admin' || data.role === 'manager' ? data.certifiedLocations : [],
    desiredHoursPerWeek: 35, // Default
    maxHoursPerWeek: 40, // Default
    hireDate: new Date().toISOString().split('T')[0],
    isActive: true,
    notificationPrefs: {
      inApp: true,
      emailSimulation: false,
    },
  }

  db.users.push(newUser)
  revalidatePath('/staff')
  return { success: true, user: newUser }
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
  const userIndex = db.users.findIndex(u => u.id === id)
  if (userIndex === -1) {
    return { success: false, error: 'User not found' }
  }

  const existing = db.users[userIndex]
  const updatedUser = { ...existing, ...data }
  
  if (data.role && (data.role === 'admin' || data.role === 'manager')) {
    updatedUser.managedLocations = updatedUser.certifiedLocations
  } else if (data.role === 'staff') {
    updatedUser.managedLocations = []
  }

  db.users[userIndex] = updatedUser
  revalidatePath('/staff')
  return { success: true, user: updatedUser }
}
