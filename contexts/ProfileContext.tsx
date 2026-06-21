'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

export interface Profile {
  id: string
  user_id: string
  name: string
  avatar_url: string | null
  avatar_tmdb_id: number | null
  pin: string | null
  role: 'user' | 'staff' | 'admin'
  is_child: boolean
  bio: string | null
  created_at: string
}

interface ProfileContextType {
  activeProfile: Profile | null
  setActiveProfile: (profile: Profile | null) => void
  profiles: Profile[]
  loadProfiles: () => Promise<void>
  clearProfile: () => void
}

const ProfileContext = createContext<ProfileContextType>({
  activeProfile: null,
  setActiveProfile: () => {},
  profiles: [],
  loadProfiles: async () => {},
  clearProfile: () => {},
})

const STORAGE_KEY = 'streamself_active_profile'

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [activeProfile, setActiveProfileState] = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])

  // Charger le profil actif depuis sessionStorage au démarrage
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) {
      try { setActiveProfileState(JSON.parse(stored)) } catch {}
    }
  }, [])

  const setActiveProfile = useCallback((profile: Profile | null) => {
    setActiveProfileState(profile)
    if (profile) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    else sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  const clearProfile = useCallback(() => {
    setActiveProfileState(null)
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  const loadProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/profiles')
      if (!res.ok) return
      const data = await res.json()
      setProfiles(data)
    } catch {}
  }, [])

  return (
    <ProfileContext.Provider value={{ activeProfile, setActiveProfile, profiles, loadProfiles, clearProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => useContext(ProfileContext)
