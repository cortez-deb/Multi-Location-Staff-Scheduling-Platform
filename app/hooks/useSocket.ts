'use client'
import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import type { Session } from '@/lib/types'
import type { SocketEvent, SocketPayload } from '@/lib/socket'

type EventHandler = (event: SocketEvent, payload: SocketPayload) => void

let _socket: Socket | null = null

function getSocket(token: string): Socket {
  if (!_socket) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    _socket = io(backendUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
    })
  }
  return _socket
}

export function useSocket(
  session: Session,
  onEvent: EventHandler
) {
  const cbRef = useRef(onEvent)
  cbRef.current = onEvent

  useEffect(() => {
    if (!session?.accessToken) return;

    const socket = getSocket(session.accessToken)

    // Listen to all ShiftSync events
    const events: SocketEvent[] = [
      'shift_assigned', 'shift_changed', 'shift_cancelled', 'schedule_published',
      'swap_requested', 'swap_accepted', 'swap_rejected', 'swap_approved', 'swap_cancelled',
      'drop_claimed', 'overtime_warning', 'availability_changed', 'conflict_detected',
      'shift_updated',
    ]

    const handler = (payload: any) => {
      // The backend emits events directly with the event name and payload
      // But we mapped it inside the handler below just in case it passes full payload
      cbRef.current(payload?.event || 'notification', payload)
    }

    for (const ev of events) {
      socket.on(ev, handler)
    }

    return () => {
      for (const ev of events) {
        socket.off(ev, handler)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, session?.accessToken])
}
