'use client'
import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import type { Session } from '@/lib/types'
import type { SocketEvent, SocketPayload } from '@/lib/socket'

type EventHandler = (event: SocketEvent, payload: SocketPayload) => void

let _socket: Socket | null = null

function getSocket(): Socket {
  if (!_socket) {
    _socket = io({
      path: '/api/socket',
      // Use WebSocket first for lowest latency
      transports: ['websocket', 'polling'],
    })
  }
  return _socket
}

export function useSocket(
  session: Pick<Session, 'userId' | 'role' | 'managedLocations' | 'certifiedLocations'>,
  onEvent: EventHandler
) {
  const cbRef = useRef(onEvent)
  cbRef.current = onEvent

  useEffect(() => {
    const socket = getSocket()

    // Join rooms
    function join() {
      socket.emit('join', {
        userId: session.userId,
        role: session.role,
        managedLocations: session.managedLocations,
        certifiedLocations: session.certifiedLocations,
      })
    }

    if (socket.connected) {
      join()
    } else {
      socket.on('connect', join)
    }

    // Listen to all ShiftSync events
    const events: SocketEvent[] = [
      'shift_assigned', 'shift_changed', 'shift_cancelled', 'schedule_published',
      'swap_requested', 'swap_accepted', 'swap_rejected', 'swap_approved', 'swap_cancelled',
      'drop_claimed', 'overtime_warning', 'availability_changed', 'conflict_detected',
      'shift_updated',
    ]

    const handler = (payload: SocketPayload) => {
      cbRef.current(payload.event, payload)
    }

    for (const ev of events) {
      socket.on(ev, handler)
    }

    return () => {
      socket.off('connect', join)
      for (const ev of events) {
        socket.off(ev, handler)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.userId])
}
