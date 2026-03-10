import { useEffect, useRef } from 'react'
import { useApi } from './useApi'
import { useAuthStore } from '../store/auth'
import type { LoopStatus } from '../api/types'

export function useLoopStatus(pollInterval = 30000) {
  const { currentRole, adminToken } = useAuthStore()
  const shouldFetch = currentRole === 'admin' || currentRole === 'user'
  const result = useApi<LoopStatus>(shouldFetch ? '/api/loop/status' : null, [currentRole, adminToken])
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (!shouldFetch) return
    intervalRef.current = setInterval(() => {
      result.refetch()
    }, pollInterval)
    return () => clearInterval(intervalRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldFetch, pollInterval])

  return result
}
