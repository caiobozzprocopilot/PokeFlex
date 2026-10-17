import { create } from 'zustand'
import { isDemo } from '../lib/supabase'
import { currentSubscription, DEFAULT_PREFS, disablePush, enablePush, loadPrefs, pushSupport, savePrefs, sendTest, type PushPrefs, type PushSupport } from '../services/push'

type PushState = {
  support: PushSupport
  permission: NotificationPermission | 'unsupported'
  subscribed: boolean
  prefs: PushPrefs
  loaded: boolean
  load: (userId: string | null) => Promise<void>
  enable: (userId: string) => Promise<void>
  disable: () => Promise<void>
  setPref: (userId: string, key: keyof PushPrefs, value: boolean) => Promise<void>
  test: () => Promise<number>
}

const permissionNow = () => ('Notification' in window ? Notification.permission : 'unsupported')

export const usePush = create<PushState>()((set, get) => ({
  support: 'unsupported',
  permission: 'default',
  subscribed: false,
  prefs: DEFAULT_PREFS,
  loaded: false,

  load: async (userId) => {
    const support = pushSupport()
    set({ support, permission: permissionNow() })
    if (!userId || support !== 'ok') return set({ loaded: true })
    const [sub, prefs] = await Promise.all([currentSubscription().catch(() => null), loadPrefs(userId).catch(() => DEFAULT_PREFS)])
    // Na demonstração não há servidor: basta a permissão do navegador.
    const granted = permissionNow() === 'granted'
    set({ subscribed: granted && (isDemo || !!sub), prefs, loaded: true })
  },

  enable: async (userId) => {
    try {
      await enablePush()
      set({ subscribed: true })
      await get().load(userId)
    } finally {
      set({ permission: permissionNow() })
    }
  },

  disable: async () => {
    await disablePush()
    set({ subscribed: false })
  },

  setPref: async (userId, key, value) => {
    const before = get().prefs
    const prefs = { ...before, [key]: value }
    set({ prefs })
    try {
      await savePrefs(userId, prefs)
    } catch (err) {
      set({ prefs: before })
      throw err
    }
  },

  test: () => sendTest(),
}))
