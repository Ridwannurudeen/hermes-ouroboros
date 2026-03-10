import { useCallback } from 'react'
import { useApi } from './useApi'
import { useAuthStore } from '../store/auth'
import type { MetaResponse } from '../api/types'

export function useMeta() {
  const { adminToken } = useAuthStore()
  const result = useApi<MetaResponse>('/api/meta', [adminToken])

  const processAuth = useCallback(() => {
    if (result.data) {
      useAuthStore.getState().setCsrfToken(result.data.csrf_token)
      useAuthStore.getState().setAuth(
        result.data.current_role,
        result.data.current_user,
        result.data.share_links_ready,
        result.data.email_verification_enabled,
      )
    }
  }, [result.data])

  if (result.data) {
    processAuth()
  }

  return result
}
