// ShiftSync — In-Memory Database + Seed Data
import type {
  Location, User, Shift, SwapRequest,
  AppNotification, AuditLog, RecurringAvailability, AvailabilityException,
} from './types'

// ── Singleton store ────────────────────────────────────────
type DB = {
  locations: Location[]
  users: User[]
  shifts: Shift[]
  swapRequests: SwapRequest[]
  notifications: AppNotification[]
  auditLogs: AuditLog[]
  recurringAvailability: RecurringAvailability[]
  availabilityExceptions: AvailabilityException[]
}

function createDB(): DB {
  return {
    locations: seedLocations(),
    users: seedUsers(),
    shifts: [],
    swapRequests: [],
    notifications: [],
    auditLogs: [],
    recurringAvailability: seedAvailability(),
    availabilityExceptions: [],
  }
}

const globalForDB = globalThis as typeof globalThis & { shiftsyncDB?: DB }

export const db: DB = globalForDB.shiftsyncDB ?? (() => {
  const d = createDB()
  d.shifts = seedShifts(d)
  return d
})()

if (process.env.NODE_ENV !== 'production') {
  globalForDB.shiftsyncDB = db
}

// ── Helpers ───────────────────────────────────────────────
function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function dateOf(offsetDays: number): string {
  const d = new Date()
  // Snap to current week Monday
  const day = d.getUTCDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + mondayOffset + offsetDays)
  return d.toISOString().split('T')[0]
}

// ── Locations ─────────────────────────────────────────────
function seedLocations(): Location[] {
  return [
    {
      id: 'loc_1', name: 'Coastal Eats – Santa Monica', shortName: 'Santa Monica',
      timezone: 'America/Los_Angeles', address: '1420 Ocean Ave', city: 'Santa Monica, CA',
      color: '#6366f1',
    },
    {
      id: 'loc_2', name: 'Coastal Eats – Venice Beach', shortName: 'Venice Beach',
      timezone: 'America/Los_Angeles', address: '25 Windward Ave', city: 'Venice, CA',
      color: '#8b5cf6',
    },
    {
      id: 'loc_3', name: 'Coastal Eats – Miami Beach', shortName: 'Miami Beach',
      timezone: 'America/New_York', address: '1234 Ocean Dr', city: 'Miami Beach, FL',
      color: '#06b6d4',
    },
    {
      id: 'loc_4', name: 'Coastal Eats – South Beach', shortName: 'South Beach',
      timezone: 'America/New_York', address: '500 Collins Ave', city: 'Miami Beach, FL',
      color: '#10b981',
    },
  ]
}

// ── Users ─────────────────────────────────────────────────
function seedUsers(): User[] {
  return [
    // ── Admin ──
    {
      id: 'user_admin', name: 'Jordan Rivera', email: 'admin@coastaleats.com',
      passwordHash: 'admin123', role: 'admin', avatarInitials: 'JR', avatarColor: '#f59e0b',
      skills: ['supervisor'], certifiedLocations: ['loc_1','loc_2','loc_3','loc_4'],
      managedLocations: ['loc_1','loc_2','loc_3','loc_4'],
      desiredHoursPerWeek: 40, maxHoursPerWeek: 50, hireDate: '2020-01-15', isActive: true,
      notificationPrefs: { inApp: true, emailSimulation: true },
    },
    // ── Managers ──
    {
      id: 'user_mgr_la', name: 'Sarah Kim', email: 'sarah.mgr@coastaleats.com',
      passwordHash: 'manager123', role: 'manager', avatarInitials: 'SK', avatarColor: '#6366f1',
      skills: ['supervisor','server'], certifiedLocations: ['loc_1','loc_2'],
      managedLocations: ['loc_1','loc_2'],
      desiredHoursPerWeek: 40, maxHoursPerWeek: 50, hireDate: '2021-03-10', isActive: true,
      notificationPrefs: { inApp: true, emailSimulation: false },
    },
    {
      id: 'user_mgr_miami', name: 'Carlos Diaz', email: 'carlos.mgr@coastaleats.com',
      passwordHash: 'manager123', role: 'manager', avatarInitials: 'CD', avatarColor: '#06b6d4',
      skills: ['supervisor','bartender'], certifiedLocations: ['loc_3','loc_4'],
      managedLocations: ['loc_3','loc_4'],
      desiredHoursPerWeek: 40, maxHoursPerWeek: 50, hireDate: '2021-05-20', isActive: true,
      notificationPrefs: { inApp: true, emailSimulation: true },
    },
    // ── Staff ──
    {
      id: 'user_alex', name: 'Alex Johnson', email: 'alex@coastaleats.com',
      passwordHash: 'staff123', role: 'staff', avatarInitials: 'AJ', avatarColor: '#ec4899',
      skills: ['bartender','server'], certifiedLocations: ['loc_1','loc_2'],
      managedLocations: [],
      desiredHoursPerWeek: 32, maxHoursPerWeek: 40, hireDate: '2022-06-01', isActive: true,
      notificationPrefs: { inApp: true, emailSimulation: false },
    },
    {
      id: 'user_maria', name: 'Maria Santos', email: 'maria@coastaleats.com',
      passwordHash: 'staff123', role: 'staff', avatarInitials: 'MS', avatarColor: '#14b8a6',
      skills: ['server','host'], certifiedLocations: ['loc_1','loc_2','loc_3'],
      managedLocations: [],
      desiredHoursPerWeek: 30, maxHoursPerWeek: 40, hireDate: '2022-08-15', isActive: true,
      notificationPrefs: { inApp: true, emailSimulation: true },
    },
    {
      id: 'user_john', name: 'John Park', email: 'john@coastaleats.com',
      passwordHash: 'staff123', role: 'staff', avatarInitials: 'JP', avatarColor: '#f97316',
      skills: ['line_cook','expo'], certifiedLocations: ['loc_1','loc_3'],
      managedLocations: [],
      desiredHoursPerWeek: 40, maxHoursPerWeek: 48, hireDate: '2021-11-01', isActive: true,
      notificationPrefs: { inApp: true, emailSimulation: false },
    },
    {
      id: 'user_priya', name: 'Priya Patel', email: 'priya@coastaleats.com',
      passwordHash: 'staff123', role: 'staff', avatarInitials: 'PP', avatarColor: '#a855f7',
      skills: ['host','server'], certifiedLocations: ['loc_1','loc_2'],
      managedLocations: [],
      desiredHoursPerWeek: 25, maxHoursPerWeek: 35, hireDate: '2023-01-10', isActive: true,
      notificationPrefs: { inApp: true, emailSimulation: false },
    },
    {
      id: 'user_tom', name: 'Tom Nguyen', email: 'tom@coastaleats.com',
      passwordHash: 'staff123', role: 'staff', avatarInitials: 'TN', avatarColor: '#0ea5e9',
      skills: ['bartender'], certifiedLocations: ['loc_3','loc_4'],
      managedLocations: [],
      desiredHoursPerWeek: 35, maxHoursPerWeek: 40, hireDate: '2022-03-20', isActive: true,
      notificationPrefs: { inApp: true, emailSimulation: true },
    },
    {
      id: 'user_linda', name: 'Linda Chen', email: 'linda@coastaleats.com',
      passwordHash: 'staff123', role: 'staff', avatarInitials: 'LC', avatarColor: '#84cc16',
      skills: ['line_cook','busser'], certifiedLocations: ['loc_3','loc_4'],
      managedLocations: [],
      desiredHoursPerWeek: 38, maxHoursPerWeek: 45, hireDate: '2021-09-05', isActive: true,
      notificationPrefs: { inApp: false, emailSimulation: false },
    },
    {
      id: 'user_sam', name: 'Sam Williams', email: 'sam@coastaleats.com',
      passwordHash: 'staff123', role: 'staff', avatarInitials: 'SW', avatarColor: '#f43f5e',
      skills: ['server','busser','host'], certifiedLocations: ['loc_2','loc_3'],
      managedLocations: [],
      desiredHoursPerWeek: 20, maxHoursPerWeek: 30, hireDate: '2023-04-01', isActive: true,
      notificationPrefs: { inApp: true, emailSimulation: false },
    },
    {
      id: 'user_nina', name: 'Nina Foster', email: 'nina@coastaleats.com',
      passwordHash: 'staff123', role: 'staff', avatarInitials: 'NF', avatarColor: '#fb923c',
      skills: ['expo','line_cook'], certifiedLocations: ['loc_1','loc_2','loc_4'],
      managedLocations: [],
      desiredHoursPerWeek: 36, maxHoursPerWeek: 40, hireDate: '2022-12-15', isActive: true,
      notificationPrefs: { inApp: true, emailSimulation: true },
    },
    {
      id: 'user_derek', name: 'Derek Wilson', email: 'derek@coastaleats.com',
      passwordHash: 'staff123', role: 'staff', avatarInitials: 'DW', avatarColor: '#7c3aed',
      skills: ['bartender','server'], certifiedLocations: ['loc_1','loc_3','loc_4'],
      managedLocations: [],
      desiredHoursPerWeek: 30, maxHoursPerWeek: 40, hireDate: '2023-02-28', isActive: true,
      notificationPrefs: { inApp: true, emailSimulation: false },
    },
  ]
}

// ── Recurring Availability ────────────────────────────────
function seedAvailability(): RecurringAvailability[] {
  const avail: RecurringAvailability[] = []
  const now = new Date().toISOString()
  // All staff available Mon-Sat, various hours
  const staffSchedules: Record<string, { days: number[]; start: string; end: string }[]> = {
    user_alex:  [{ days:[1,2,3,4,5,6], start:'10:00', end:'23:00' }],
    user_maria: [{ days:[1,2,3,4,5],   start:'09:00', end:'17:00' }, { days:[6], start:'10:00', end:'22:00' }],
    user_john:  [{ days:[2,3,4,5,6,0], start:'08:00', end:'16:00' }],
    user_priya: [{ days:[1,3,5],       start:'16:00', end:'23:30' }],
    user_tom:   [{ days:[3,4,5,6,0],   start:'12:00', end:'02:00' }],
    user_linda: [{ days:[1,2,3,4,5],   start:'07:00', end:'15:00' }],
    user_sam:   [{ days:[5,6,0],       start:'17:00', end:'23:59' }],
    user_nina:  [{ days:[1,2,3,4,5,6], start:'11:00', end:'19:00' }],
    user_derek: [{ days:[1,2,4,5,6],   start:'14:00', end:'23:59' }],
  }
  let i = 0
  for (const [userId, schedules] of Object.entries(staffSchedules)) {
    for (const s of schedules) {
      for (const day of s.days) {
        avail.push({
          id: `avail_${i++}`,
          userId,
          dayOfWeek: day,
          startTime: s.start,
          endTime: s.end,
          available: true,
          updatedAt: now,
        })
      }
    }
  }
  return avail
}

// ── Shifts ────────────────────────────────────────────────
function seedShifts(d: DB): Shift[] {
  const shifts: Shift[] = []

  function mkShift(
    locId: Location['id'],
    offsetDay: number,
    start: string,
    end: string,
    skill: Shift['requiredSkill'],
    headcount: number,
    assignedStaff: string[],
    status: Shift['status'] = 'published'
  ): Shift {
    const date = dateOf(offsetDay)
    const [h] = start.split(':').map(Number)
    const dowOffset = new Date(date + 'T12:00:00Z').getUTCDay()
    const isPremium = (dowOffset === 5 || dowOffset === 6) && h >= 17

    return {
      id: uid('shift'),
      locationId: locId,
      date,
      startTime: start,
      endTime: end,
      isOvernight: end < start,
      requiredSkill: skill,
      headcount,
      assignedStaff,
      status,
      publishedAt: status === 'published' ? new Date().toISOString() : undefined,
      editCutoffHours: 48,
      createdBy: locId === 'loc_1' || locId === 'loc_2' ? 'user_mgr_la' : 'user_mgr_miami',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPremium,
      notes: undefined,
    }
  }

  // This week — LA locations
  shifts.push(mkShift('loc_1', 0, '10:00', '16:00', 'server',     2, ['user_maria', 'user_priya']))
  shifts.push(mkShift('loc_1', 0, '16:00', '23:00', 'bartender',  1, ['user_alex']))
  // shifts.push(mkShift('loc_1', 1, '09:00', '17:00', 'line_cook',  2, ['user_john', 'user_nina']))
  // shifts.push(mkShift('loc_1', 2, '10:00', '18:00', 'server',     2, ['user_maria', 'user_derek']))
  // shifts.push(mkShift('loc_1', 3, '16:00', '00:00', 'bartender',  2, ['user_alex', 'user_derek']))
  // shifts.push(mkShift('loc_1', 4, '17:00', '23:30', 'server',     3, ['user_maria', 'user_priya', 'user_derek']))
  // shifts.push(mkShift('loc_1', 5, '18:00', '02:00', 'bartender',  2, ['user_alex', 'user_derek']))
  // shifts.push(mkShift('loc_1', 6, '12:00', '20:00', 'host',       1, ['user_priya']))

  // shifts.push(mkShift('loc_2', 0, '11:00', '19:00', 'server',     2, ['user_sam', 'user_nina']))
  // shifts.push(mkShift('loc_2', 1, '10:00', '18:00', 'expo',       1, ['user_nina']))
  // shifts.push(mkShift('loc_2', 4, '17:00', '01:00', 'server',     2, ['user_sam', 'user_maria']))
  // shifts.push(mkShift('loc_2', 5, '16:00', '00:00', 'host',       1, ['user_priya']))
  // shifts.push(mkShift('loc_2', 6, '11:00', '21:00', 'bartender',  1, ['user_alex']))

  // This week — Miami locations
  shifts.push(mkShift('loc_3', 0, '09:00', '17:00', 'line_cook',  2, ['user_linda', 'user_john']))
  shifts.push(mkShift('loc_3', 1, '12:00', '20:00', 'server',     2, ['user_maria', 'user_sam']))
  // shifts.push(mkShift('loc_3', 2, '16:00', '00:00', 'bartender',  2, ['user_tom', 'user_derek']))
  // shifts.push(mkShift('loc_3', 3, '10:00', '18:00', 'line_cook',  1, ['user_linda']))
  // shifts.push(mkShift('loc_3', 4, '17:00', '01:00', 'bartender',  2, ['user_tom', 'user_derek']))
  // shifts.push(mkShift('loc_3', 5, '18:00', '02:00', 'server',     3, ['user_sam', 'user_maria', 'user_derek']))
  // shifts.push(mkShift('loc_3', 6, '11:00', '19:00', 'host',       1, []))

  // shifts.push(mkShift('loc_4', 0, '10:00', '18:00', 'busser',     2, ['user_linda', 'user_sam']))
  // shifts.push(mkShift('loc_4', 1, '16:00', '00:00', 'bartender',  1, ['user_tom']))
  // shifts.push(mkShift('loc_4', 3, '09:00', '17:00', 'line_cook',  1, ['user_linda']))
  // shifts.push(mkShift('loc_4', 4, '17:00', '23:00', 'server',     2, ['user_sam', 'user_nina']))
  // shifts.push(mkShift('loc_4', 5, '19:00', '03:00', 'bartender',  2, ['user_tom', 'user_derek']))
  shifts.push(mkShift('loc_4', 6, '12:00', '22:00', 'server',     2, ['user_sam', 'user_nina']))

  // Draft shifts for next week
  shifts.push(mkShift('loc_1', 7, '10:00', '18:00', 'server', 2, [], 'draft'))
  shifts.push(mkShift('loc_1', 8, '16:00', '00:00', 'bartender', 1, [], 'draft'))
  shifts.push(mkShift('loc_3', 7, '09:00', '17:00', 'line_cook', 2, [], 'draft'))

  return shifts
}

// ── DB Helpers ────────────────────────────────────────────
export function findUser(id: string) {
  return db.users.find(u => u.id === id) ?? null
}

export function findUserByEmail(email: string) {
  return db.users.find(u => u.email === email) ?? null
}

export function findShift(id: string) {
  return db.shifts.find(s => s.id === id) ?? null
}

export function findSwap(id: string) {
  return db.swapRequests.find(s => s.id === id) ?? null
}

export function nextId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}
