import { useState, useCallback } from 'react'
import { apiFetch } from '../api/client'
import type { SessionSummary } from '../api/types'

interface SessionFilters {
  q?: string
  backend?: string
  conflict?: boolean
  limit?: number
}

export function useSessions() {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSessions = useCallback(async (filters: SessionFilters = {}) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.q) params.set('q', filters.q)
      if (filters.backend) params.set('backend', filters.backend)
      if (filters.conflict !== undefined) params.set('conflict', String(filters.conflict))
      params.set('limit', String(filters.limit || 20))
      const qs = params.toString()
      const data = await apiFetch<SessionSummary[]>(`/api/sessions${qs ? `?${qs}` : ''}`)
      setSessions(data)
    } catch {
      // Silently fail for guest users
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [])

  return { sessions, loading, fetchSessions }
}
