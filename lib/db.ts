import { fetchApi } from './api';
import { DateTime } from 'luxon';

// Helper to generate a consistent color from a string
function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
}

import type { Location, User, Shift, SwapRequest, AppNotification, RecurringAvailability, AvailabilityException } from './types';

export async function getDb(): Promise<{
  locations: Location[];
  users: User[];
  shifts: Shift[];
  swapRequests: SwapRequest[];
  notifications: AppNotification[];
  leaveRequests: any[];
  skills: { id: string, name: string }[];
  recurringAvailability: RecurringAvailability[];
  availabilityExceptions: AvailabilityException[];
}> {
  const [usersRes, locationsRes, shiftsRes, swapsRes, skillsRes, notificationsRes, leaveRes] = await Promise.all([
    fetchApi('/api/users'),
    fetchApi('/api/locations'),
    fetchApi('/api/shifts'),
    fetchApi('/api/swaps'),
    fetchApi('/api/skills'),
    fetchApi('/api/notifications'),
    fetchApi('/api/leave')
  ]);

  const skillsMap = new Map(skillsRes.map((s: any) => [s.id, s.name]));

  const locations = (locationsRes || []).map((l: any) => ({
    id: l.id,
    name: l.name || 'Unnamed Location',
    shortName: (l.name || 'Loc').split(' ')[0],
    timezone: l.timezone || 'UTC',
    address: l.address || '',
    city: '',
    color: stringToColor(l.id),
    shiftCount: l.shiftCount || 0
  }));

  const users = usersRes.map((u: any) => {
    const initials = u.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatarInitials: initials,
      avatarColor: stringToColor(u.id),
      skills: (u.skills || u.Skills || []).map((s: any) => s.id || s),
      certifiedLocations: (u.certifiedLocations || u.Locations || []).map((l: any) => l.id),
      managedLocations: (u.managedLocations || []).map((l: any) => l.id),
      manager: u.manager,
      reportsToId: u.reportsToId,

      desiredHoursPerWeek: u.desiredHours || 40,
      maxHoursPerWeek: 40,
      isActive: true,
      notificationPrefs: { inApp: true, emailSimulation: false }
    };
  });

  const shifts = shiftsRes.map((s: any) => {
    const loc = locations.find((l: any) => l.id === s.locationId);
    const tz = loc ? loc.timezone : 'UTC';
    
    const startDt = DateTime.fromISO(s.startUtc).setZone(tz);
    const endDt = DateTime.fromISO(s.endUtc).setZone(tz);
    
    return {
      id: s.id,
      locationId: s.locationId,
      startUtc: s.startUtc,
      date: startDt.toISODate(),
      startTime: startDt.toFormat('HH:mm'),
      endTime: endDt.toFormat('HH:mm'),
      isOvernight: endDt.day !== startDt.day,
      requiredSkill: s.skillId || 'staff',
      headcount: s.headcount || 1,
      assignedStaff: (s.assignments || []).filter((a: any) => a.status === 'assigned').map((a: any) => a.userId),
      status: s.isPublished ? 'published' : 'draft',
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      isPremium: startDt.weekday >= 5 && startDt.hour >= 17,
      editCutoffHours: s.cutoffHours || 48
    };
  });

  const swapRequests = swapsRes.map((s: any) => ({
    id: s.id,
    type: s.targetId ? 'swap' : 'drop',
    requesterId: s.requesterId,
    shiftId: s.shiftId,
    targetStaffId: s.targetId,
    status: s.status === 'PENDING_ACCEPT' ? 'pending' : (s.status === 'PENDING_MANAGER' ? 'accepted' : s.status.toLowerCase()),
    createdAt: s.createdAt
  }));

  const notifications = notificationsRes || [];
  const leaveRequests = leaveRes || [];

  return {
    locations,
    users,
    shifts,
    swapRequests,
    notifications,
    leaveRequests,
    skills: skillsRes,
    recurringAvailability: [],
    availabilityExceptions: []
  };
}

export async function findUser(id: string) {
  const db = await getDb();
  return db.users.find((u: any) => u.id === id);
}

export async function findShift(id: string) {
  const db = await getDb();
  return db.shifts.find((s: any) => s.id === id);
}
