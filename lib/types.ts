// ============================================================
// ShiftSync — Core TypeScript Types
// ============================================================

export type Role = 'admin' | 'manager' | 'staff'

export type Skill =
  | 'bartender'
  | 'line_cook'
  | 'server'
  | 'host'
  | 'supervisor'
  | 'expo'
  | 'busser'

export type LocationId = 'loc_1' | 'loc_2' | 'loc_3' | 'loc_4'

export type ShiftStatus = 'draft' | 'published'

export type SwapStatus =
  | 'pending'
  | 'accepted'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'expired'

export type SwapType = 'swap' | 'drop'

export type NotificationType =
  | 'shift_assigned'
  | 'shift_changed'
  | 'shift_removed'
  | 'schedule_published'
  | 'swap_requested'
  | 'swap_accepted'
  | 'swap_approved'
  | 'swap_rejected'
  | 'swap_cancelled'
  | 'drop_claimed'
  | 'overtime_warning'
  | 'availability_changed'
  | 'override_required'

// ─────────────────────────────────────────────────────────────
// Location
// ─────────────────────────────────────────────────────────────
export interface Location {
  id: LocationId
  name: string
  shortName: string
  timezone: string // IANA timezone string e.g. "America/Los_Angeles"
  address: string
  city: string
  color: string // CSS hex for UI theming
}

// ─────────────────────────────────────────────────────────────
// User
// ─────────────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
  passwordHash: string // In real app: bcrypt. Here: plain for demo
  role: Role
  avatarInitials: string
  avatarColor: string
  skills: Skill[]
  certifiedLocations: LocationId[]
  managedLocations: LocationId[] // relevant for managers
  desiredHoursPerWeek: number
  maxHoursPerWeek: number
  phone?: string
  hireDate: string
  isActive: boolean
  notificationPrefs: {
    inApp: boolean
    emailSimulation: boolean
  }
}

// ─────────────────────────────────────────────────────────────
// Availability
// ─────────────────────────────────────────────────────────────
export interface RecurringAvailability {
  id: string
  userId: string
  dayOfWeek: number // 0=Sun, 1=Mon, ... 6=Sat
  startTime: string // "HH:MM" in user's local reference
  endTime: string
  available: boolean
  updatedAt: string
}

export interface AvailabilityException {
  id: string
  userId: string
  date: string // ISO "YYYY-MM-DD"
  startTime?: string // undefined = fully unavailable
  endTime?: string
  available: boolean
  reason?: string
  createdAt: string
}

// ─────────────────────────────────────────────────────────────
// Shift
// ─────────────────────────────────────────────────────────────
export interface Shift {
  id: string
  locationId: LocationId
  date: string // ISO "YYYY-MM-DD" in location's timezone
  startTime: string // "HH:MM" local to location
  endTime: string // "HH:MM" local (may be next day = overnight if endTime < startTime)
  isOvernight: boolean
  requiredSkill: Skill
  headcount: number
  assignedStaff: string[] // user IDs
  status: ShiftStatus
  publishedAt?: string
  editCutoffHours: number // hours before shift start when editing is locked (default 48)
  createdBy: string
  createdAt: string
  updatedAt: string
  isPremium: boolean // auto-tagged: Fri/Sat evening (after 5pm)
  notes?: string
}

// ─────────────────────────────────────────────────────────────
// Swap / Drop Request
// ─────────────────────────────────────────────────────────────
export interface SwapRequest {
  id: string
  type: SwapType
  requesterId: string
  shiftId: string
  targetStaffId?: string // set for swap; undefined for drop
  targetShiftId?: string // if staff B offers a counter-shift
  status: SwapStatus
  requesterNote?: string
  managerNote?: string
  createdAt: string
  expiresAt: string // for drops: 24h before shift; for swaps: 72h
  resolvedAt?: string
  managerApprovedBy?: string
  cancelReason?: string
}

// ─────────────────────────────────────────────────────────────
// Notification
// ─────────────────────────────────────────────────────────────
export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: string
  relatedShiftId?: string
  relatedSwapId?: string
  relatedUserId?: string
}

// ─────────────────────────────────────────────────────────────
// Audit Log
// ─────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string
  entityType: 'shift' | 'swap' | 'user' | 'availability'
  entityId: string
  action: string
  before: unknown
  after: unknown
  performedBy: string // user ID
  performedAt: string // ISO timestamp
  locationId?: LocationId
  metadata?: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────
// Session
// ─────────────────────────────────────────────────────────────
export interface Session {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    desiredHours?: number;
    notifyInApp?: boolean;
    notifyEmail?: boolean;
  };
  managedLocations: LocationId[];
  certifiedLocations: LocationId[];
}

// ─────────────────────────────────────────────────────────────
// Constraint Validation
// ─────────────────────────────────────────────────────────────
export type ConstraintSeverity = 'error' | 'warning' | 'override_required'

export interface ConstraintViolation {
  ruleId: string
  severity: ConstraintSeverity
  message: string
  detail: string
  suggestions?: AlternativeStaff[]
  overrideAllowed: boolean
}

export interface AlternativeStaff {
  userId: string
  name: string
  reason: string // why they're a good fit
}

export interface ConstraintCheckResult {
  valid: boolean
  violations: ConstraintViolation[]
  warnings: ConstraintViolation[]
}

// ─────────────────────────────────────────────────────────────
// SSE Events
// ─────────────────────────────────────────────────────────────
export type SSEEventType =
  | 'shift_created'
  | 'shift_updated'
  | 'shift_published'
  | 'shift_assigned'
  | 'swap_created'
  | 'swap_updated'
  | 'notification'
  | 'conflict_detected'
  | 'heartbeat'

export interface SSEEvent {
  type: SSEEventType
  payload: unknown
  timestamp: string
  targetUserIds?: string[] // undefined = broadcast to all
}

// ─────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────
export interface StaffHoursSummary {
  userId: string
  name: string
  totalHours: number
  regularHours: number
  overtimeHours: number
  premiumShifts: number
  totalShifts: number
  desiredHours: number
  variance: number // totalHours - desiredHours
  fairnessScore: number // 0-100
}

export interface OvertimeProjection {
  userId: string
  name: string
  currentWeekHours: number
  projectedHours: number
  overtimeHours: number
  overtimeCost: number // projected additional cost
  triggeringShiftIds: string[]
}

export interface FairnessReport {
  period: { from: string; to: string }
  locationId?: LocationId
  staffSummaries: StaffHoursSummary[]
  overallFairnessScore: number
  premiumShiftDistribution: Record<string, number> // userId -> premium shift count
}

// ─────────────────────────────────────────────────────────────
// API Response Helpers
// ─────────────────────────────────────────────────────────────
export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: string
  violations?: ConstraintViolation[]
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
