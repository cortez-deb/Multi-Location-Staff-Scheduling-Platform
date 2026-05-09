'use client'
import { useEffect, useRef, useState } from 'react'
import type { SSEEvent } from '@/lib/types'

export function useSSE(onEvent: (e: SSEEvent) => void) {
  const cbRef = useRef(onEvent)
  cbRef.current = onEvent

  useEffect(() => {
    let es: EventSource
    let retry: ReturnType<typeof setTimeout>

    function connect() {
      es = new EventSource('/api/events')
      es.onmessage = (e) => {
        try { cbRef.current(JSON.parse(e.data)) } catch {}
      }
      es.onerror = () => {
        es.close()
        retry = setTimeout(connect, 5000)
      }
    }
    connect()
    return () => { es?.close(); clearTimeout(retry) }
  }, [])
}
