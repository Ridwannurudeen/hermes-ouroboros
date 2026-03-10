import { useState, useRef, useCallback } from 'react'
import { useAuthStore } from '../store/auth'
import type { SSEAgentEvent, SSEFinalEvent, SSEEvent } from '../api/types'

interface SSEState {
  completedAgents: Record<string, SSEAgentEvent>
  finalPayload: SSEFinalEvent | null
  isStreaming: boolean
  error: string | null
  elapsed: number
}

export function useSSE() {
  const [state, setState] = useState<SSEState>({
    completedAgents: {},
    finalPayload: null,
    isStreaming: false,
    error: null,
    elapsed: 0,
  })

  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const startTimeRef = useRef(0)

  const abort = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.cancel()
      readerRef.current = null
    }
    clearInterval(timerRef.current)
    setState((s) => ({ ...s, isStreaming: false }))
  }, [])

  const startQuery = useCallback(
    async (query: string, mode: string) => {
      abort()

      setState({
        completedAgents: {},
        finalPayload: null,
        isStreaming: true,
        error: null,
        elapsed: 0,
      })

      startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setState((s) => ({
          ...s,
          elapsed: Math.floor((Date.now() - startTimeRef.current) / 1000),
        }))
      }, 1000)

      const { csrfToken, adminToken } = useAuthStore.getState()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken

      try {
        const response = await fetch('/api/query/stream', {
          method: 'POST',
          headers,
          credentials: 'same-origin',
          body: JSON.stringify({ query, mode }),
        })

        if (!response.ok) {
          throw new Error(await response.text())
        }

        const reader = response.body!.getReader()
        readerRef.current = reader
        const decoder = new TextDecoder()
        let buffer = ''
        let finalPayload: SSEFinalEvent | null = null

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const chunks = buffer.split('\n\n')
          buffer = chunks.pop()!
          for (const chunk of chunks) {
            if (!chunk.startsWith('data: ')) continue
            let event: SSEEvent
            try {
              event = JSON.parse(chunk.slice(6))
            } catch {
              continue
            }
            if (event.type === 'agent_complete') {
              setState((s) => ({
                ...s,
                completedAgents: { ...s.completedAgents, [event.role]: event as SSEAgentEvent },
              }))
            } else if (event.type === 'final') {
              finalPayload = event as SSEFinalEvent
            } else if (event.type === 'error') {
              throw new Error(event.message)
            }
          }
        }

        if (!finalPayload) throw new Error('Stream ended without a final result.')
        setState((s) => ({ ...s, finalPayload, isStreaming: false }))
        clearInterval(timerRef.current)
      } catch (e) {
        clearInterval(timerRef.current)
        setState((s) => ({
          ...s,
          isStreaming: false,
          error: e instanceof Error ? e.message : String(e),
        }))
      }
    },
    [abort],
  )

  return { ...state, startQuery, abort }
}
