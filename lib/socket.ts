// ============================================================
// ShiftSync — Socket.io Server Singleton
//
// Room strategy:
//   user:{userId}          — private room for personal notifications
//   location:{locationId}  — managers/admins watching a location
//   role:manager           — all managers
//   role:admin             — all admins
//
// API routes emit via this module; the custom server (server.ts) 
// calls initSocketServer() once to attach the io instance.
// ============================================================

import type { Server as SocketIOServer, Socket } from 'socket.io'
import type { Session } from './types'

export type SocketEvent =
  | 'shift_assigned'
  | 'shift_changed'
  | 'shift_cancelled'
  | 'schedule_published'
  | 'swap_requested'
  | 'swap_accepted'
  | 'swap_rejected'
  | 'swap_approved'
  | 'swap_cancelled'
  | 'drop_claimed'
  | 'overtime_warning'
  | 'availability_changed'
  | 'conflict_detected'
  | 'shift_updated'     // generic UI refresh hint
  | 'LEAVE_REQUESTED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'LEAVE_CANCELLED'
  | 'LEAVE_SHIFT_UNASSIGNED'
  | 'MANAGER_ASSIGNED'
  | 'SKILL_ADDED'
  | 'LOCATION_CERTIFIED'
  | 'heartbeat'

export interface SocketPayload {
  event: SocketEvent
  title: string
  message: string
  data?: unknown
}

// ── Global singleton ─────────────────────────────────────────
const g = globalThis as typeof globalThis & { _io?: SocketIOServer }

export function initSocketServer(io: SocketIOServer) {
  g._io = io

  io.on('connection', (socket: Socket) => {
    // Client sends its session info right after connecting
    socket.on('join', (session: { userId: string; role: string; managedLocations: string[]; certifiedLocations: string[] }) => {
      // Always join personal room
      socket.join(`user:${session.userId}`)

      // Role rooms
      socket.join(`role:${session.role}`)

      // Location rooms:
      // managers/admins join as location:loc_x (to receive broadcast events for that location)
      // staff join their certified locations too so they get schedule_published etc.
      const locs = session.role === 'staff'
        ? session.certifiedLocations
        : session.managedLocations

      for (const locId of locs) {
        socket.join(`location:${locId}`)
      }
    })
  })

  // Heartbeat
  setInterval(() => {
    io.emit('heartbeat', { ts: Date.now() })
  }, 30_000)
}

function getIO(): SocketIOServer | null {
  return g._io ?? null
}

// ── Targeted emitters ─────────────────────────────────────────

/** Send to specific user IDs only */
export function emitToUsers(userIds: string[], event: SocketEvent, payload: Omit<SocketPayload, 'event'>) {
  const io = getIO()
  if (!io) return
  const full: SocketPayload = { event, ...payload }
  for (const uid of userIds) {
    io.to(`user:${uid}`).emit(event, full)
  }
}

/** Emit to all connected clients watching a location (managers + assigned staff) */
export function emitToLocation(locationId: string, event: SocketEvent, payload: Omit<SocketPayload, 'event'>) {
  const io = getIO()
  if (!io) return
  io.to(`location:${locationId}`).emit(event, { event, ...payload })
}

/** Emit to all managers + admins */
export function emitToManagers(event: SocketEvent, payload: Omit<SocketPayload, 'event'>) {
  const io = getIO()
  if (!io) return
  const full: SocketPayload = { event, ...payload }
  io.to('role:manager').to('role:admin').emit(event, full)
}

/** Broadcast to everyone */
export function broadcast(event: SocketEvent, payload: Omit<SocketPayload, 'event'>) {
  const io = getIO()
  if (!io) return
  io.emit(event, { event, ...payload })
}
