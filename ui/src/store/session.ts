import { create } from 'zustand'
import type { SessionResult } from '../api/types'

interface SessionState {
  selectedSessionId: string | null
  currentSession: SessionResult | null
  setSelectedSession: (id: string | null) => void
  setCurrentSession: (session: SessionResult | null) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  selectedSessionId: null,
  currentSession: null,
  setSelectedSession: (id) => set({ selectedSessionId: id }),
  setCurrentSession: (session) => set({ currentSession: session }),
}))
