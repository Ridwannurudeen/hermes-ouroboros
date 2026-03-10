import { useApi } from './useApi'
import { useAuthStore } from '../store/auth'
import type { StatsResponse } from '../api/types'

export function useStats() {
  const { currentRole, adminToken } = useAuthStore()
  const shouldFetch = currentRole === 'admin' || currentRole === 'user'
  return useApi<StatsResponse>(shouldFetch ? '/api/stats' : null, [currentRole, adminToken])
}
