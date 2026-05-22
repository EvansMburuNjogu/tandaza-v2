"use client"

import { User } from "@/lib/api/contracts"
import { create } from "zustand"

type SessionState = {
  token: string | null
  user: User | null
  hydrated: boolean
  setSession: (payload: { token?: string | null; user: User | null }) => void
  clearSession: () => void
  markHydrated: () => void
}

export const useSessionStore = create<SessionState>()((set) => ({
  token: null,
  user: null,
  hydrated: false,
  setSession: ({ token = null, user }) => set({ token, user, hydrated: true }),
  clearSession: () => set({ token: null, user: null, hydrated: true }),
  markHydrated: () => set({ hydrated: true })
}))
