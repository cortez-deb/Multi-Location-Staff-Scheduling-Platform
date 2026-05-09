// ============================================================
// ShiftSync — Server-Sent Events (SSE) Emitter
// Module-level singleton so all route handlers share one emitter
// ============================================================

import type { SSEEvent, SSEEventType } from './types'

type SSEClient = {
  id: string
  userId: string
  controller: ReadableStreamDefaultController
}

class SSEEmitter {
  private clients: Map<string, SSEClient> = new Map()

  // ── Register a new SSE client connection ──────────────────
  register(clientId: string, userId: string, controller: ReadableStreamDefaultController): void {
    this.clients.set(clientId, { id: clientId, userId, controller })
  }

  // ── Remove a disconnected client ──────────────────────────
  unregister(clientId: string): void {
    this.clients.delete(clientId)
  }

  // ── Emit an event to specific users or all clients ────────
  emit(event: Omit<SSEEvent, 'timestamp'>): void {
    const fullEvent: SSEEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    }

    const data = `data: ${JSON.stringify(fullEvent)}\n\n`
    const encoder = new TextEncoder()
    const encoded = encoder.encode(data)

    for (const [clientId, client] of this.clients) {
      // If targetUserIds is set, only send to those users
      if (fullEvent.targetUserIds && !fullEvent.targetUserIds.includes(client.userId)) {
        continue
      }

      try {
        client.controller.enqueue(encoded)
      } catch {
        // Client disconnected — clean up
        this.clients.delete(clientId)
      }
    }
  }

  // ── Convenience: emit to specific users ───────────────────
  emitToUsers(userIds: string[], type: SSEEventType, payload: unknown): void {
    this.emit({ type, payload, targetUserIds: userIds })
  }

  // ── Convenience: broadcast to all ─────────────────────────
  broadcast(type: SSEEventType, payload: unknown): void {
    this.emit({ type, payload })
  }

  // ── Heartbeat (keep connections alive) ────────────────────
  startHeartbeat(intervalMs = 30000): NodeJS.Timer {
    return setInterval(() => {
      this.broadcast('heartbeat', { ts: Date.now() })
    }, intervalMs)
  }

  get clientCount(): number {
    return this.clients.size
  }
}

// ── Module-level singleton ─────────────────────────────────
const globalForSSE = globalThis as typeof globalThis & { sseEmitter?: SSEEmitter }

export const sseEmitter = globalForSSE.sseEmitter ?? new SSEEmitter()

if (process.env.NODE_ENV !== 'production') {
  globalForSSE.sseEmitter = sseEmitter
}

export default sseEmitter
