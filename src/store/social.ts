import { create } from 'zustand'
import { fetchMySettings, saveMySettings, type SocialSettings } from '../services/social'

type SocialState = {
  settings: SocialSettings
  loaded: boolean
  load: (userId: string | null) => Promise<void>
  save: (userId: string, settings: SocialSettings) => Promise<void>
}

const EMPTY: SocialSettings = { username: null, isPublic: false, showValue: false, bio: '' }

export const useSocial = create<SocialState>()((set) => ({
  settings: EMPTY,
  loaded: false,

  load: async (userId) => {
    if (!userId) return set({ settings: EMPTY, loaded: false })
    try {
      set({ settings: await fetchMySettings(userId), loaded: true })
    } catch {
      set({ settings: EMPTY, loaded: true })
    }
  },

  save: async (userId, settings) => {
    await saveMySettings(userId, settings)
    set({
      settings: { ...settings, username: settings.username?.trim().toLowerCase() || null, bio: settings.bio.trim() },
      loaded: true,
    })
  },
}))
