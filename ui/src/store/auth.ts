import { create } from 'zustand'

const ADMIN_TOKEN_KEY = 'hermes_admin_token'

interface AuthState {
  csrfToken: string | null
  adminToken: string
  currentRole: 'admin' | 'user' | 'guest' | null
  currentUser: string | null
  shareLinksReady: boolean
  emailVerificationEnabled: boolean
  setCsrfToken: (token: string | null) => void
  setAdminToken: (token: string) => void
  setAuth: (role: string | null, user: string | null, shareReady: boolean, emailVerification: boolean) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  csrfToken: null,
  adminToken: sessionStorage.getItem(ADMIN_TOKEN_KEY) || '',
  currentRole: null,
  currentUser: null,
  shareLinksReady: false,
  emailVerificationEnabled: false,
  setCsrfToken: (token) => set({ csrfToken: token }),
  setAdminToken: (token) => {
    if (token) {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
    } else {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY)
    }
    set({ adminToken: token })
  },
  setAuth: (role, user, shareReady, emailVerification) =>
    set({
      currentRole: role as AuthState['currentRole'],
      currentUser: user,
      shareLinksReady: shareReady,
      emailVerificationEnabled: emailVerification,
    }),
  clearAuth: () => {
    set({ csrfToken: null, currentRole: null, currentUser: null })
  },
}))
