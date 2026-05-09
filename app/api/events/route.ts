// GET /api/events  — SSE stream for real-time updates
import { sseEmitter } from '@/lib/sse'
import { requireSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await requireSession().catch(() => null)
  if (!session) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const clientId = `${session.userId}_${Date.now()}`

  const stream = new ReadableStream({
    start(controller) {
      sseEmitter.register(clientId, session.userId, controller)
      // Send connected event
      const msg = `data: ${JSON.stringify({ type: 'connected', payload: { userId: session.userId }, timestamp: new Date().toISOString() })}\n\n`
      controller.enqueue(new TextEncoder().encode(msg))
    },
    cancel() {
      sseEmitter.unregister(clientId)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
