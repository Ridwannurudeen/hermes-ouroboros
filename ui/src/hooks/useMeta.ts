import { useEffect } from 'react'
import { useApi } from './useApi'
import { useAuthStore } from '../store/auth'
import type { MetaResponse } from '../api/types'

export function useMeta() {
  const adminToken = useAuthStore((s) => s.adminToken)
  const result = useApi<MetaResponse>('/api/meta', [adminToken])

  useEffect(() => {
    if (result.data) {
      const { setCsrfToken, setAuth } = useAuthStore.getState()
      setCsrfToken(result.data.csrf_token)
      setAuth(
        result.data.current_role,
        result.data.current_user,
        result.data.share_links_ready,
        result.data.email_verification_enabled,
      )
    }
  }, [result.data])

  return result
}
