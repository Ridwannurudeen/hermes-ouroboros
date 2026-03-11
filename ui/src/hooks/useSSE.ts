import { useState, useRef, useCallback, useEffect } from 'react'
import { useAuthStore } from '../store/auth'
import type { SSEAgentEvent, SSEFinalEvent, SSEEvent } from '../api/types'

interface SSEState {
  completedAgents: Record<string, SSEAgentEvent>
  finalPayload: SSEFinalEvent | null
  isStreaming: boolean
  error: string | null
  elapsed: number
  streamingText: Record<string, string>
}

export function useSSE() {
  const [state, setState] = useState<SSEState>({
    completedAgents: {},
    finalPayload: null,
    isStreaming: false,
    error: null,
    elapsed: 0,
    streamingText: {},
  })

  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const startTimeRef = useRef(0)
  const streamingTextRef = useRef<Record<string, string>>({})
  const syncIntervalRef = useRef<ReturnType<typeof setInterval>>()

  // Sync streaming text ref → state at ~10fps
  useEffect(() => {
    if (state.isStreaming) {
      syncIntervalRef.current = setInterval(() => {
        setState((s) => {
          const current = streamingTextRef.current
          // Only update if there are actual changes
          const keys = Object.keys(current)
          if (keys.length === 0 && Object.keys(s.streamingText).length === 0) return s
          let changed = false
          for (const k of keys) {
            if (s.streamingText[k] !== current[k]) {
              changed = true
              break
            }
          }
          if (!changed && keys.length === Object.keys(s.streamingText).length) return s
          return { ...s, streamingText: { ...current } }
        })
      }, 100)
    }
    return () => clearInterval(syncIntervalRef.current)
  }, [state.isStreaming])

  const abort = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.cancel()
      readerRef.current = null
    }
    clearInterval(timerRef.current)
    clearInterval(syncIntervalRef.current)
    setState((s) => ({ ...s, isStreaming: false }))
  }, [])

  const startQuery = useCallback(
    async (query: string, mode: string) => {
      abort()

      streamingTextRef.current = {}
      setState({
        completedAgents: {},
        finalPayload: null,
        isStreaming: true,
        error: null,
        elapsed: 0,
        streamingText: {},
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
            if (event.type === 'agent_token') {
              const prev = streamingTextRef.current[event.role] || ''
              streamingTextRef.current[event.role] = prev + event.token
            } else if (event.type === 'agent_complete') {
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
        // Final sync of streaming text
        setState((s) => ({ ...s, finalPayload, isStreaming: false, streamingText: { ...streamingTextRef.current } }))
        clearInterval(timerRef.current)
        clearInterval(syncIntervalRef.current)
      } catch (e) {
        clearInterval(timerRef.current)
        clearInterval(syncIntervalRef.current)
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
