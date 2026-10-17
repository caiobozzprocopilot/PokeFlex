import { create } from 'zustand'
import { isDemo, supabase } from '../lib/supabase'
import { newLocalMascot, todaySP, toStatus, touch, type LocalMascot, type MascotEvent, type MascotStatus } from '../utils/mascot'

const DEMO_KEY = 'pokeflex-mascot'

const readDemo = (): LocalMascot => {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    return raw ? { ...newLocalMascot(), ...(JSON.parse(raw) as LocalMascot) } : newLocalMascot()
  } catch {
    return newLocalMascot()
  }
}

const writeDemo = (m: LocalMascot) => {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(m))
  } catch {
    // Sem armazenamento: o mascote vale só nesta visita.
  }
}

type Row = {
  xp: number
  stage: number
  current_streak: number
  best_streak: number
  last_active_day: string | null
  today: string
  freeze_crystals: number
  freezes_used: string[]
  state: MascotStatus['state']
  relight_progress: number
  missions: MascotStatus['missions']
}

type MascotStore = {
  status: MascotStatus | null
  error: string | null
  load: (userId: string | null) => Promise<void>
  event: (kind: MascotEvent, amount?: number, shiny?: boolean) => void
}

let reloadTimer: number | undefined

export const useMascot = create<MascotStore>()((set, get) => ({
  status: null,
  error: null,

  load: async (userId) => {
    if (isDemo) return set({ status: toStatus(readDemo()), error: null })
    if (!userId) return set({ status: null, error: null })
    const { data, error } = await supabase!.rpc('my_mascot')
    if (error || !data) return set({ error: 'Não foi possível carregar o Fagulin.' })
    const r = data as Row
    set({
      error: null,
      status: {
        xp: r.xp,
        stage: r.stage,
        currentStreak: r.current_streak,
        bestStreak: r.best_streak,
        lastActiveDay: r.last_active_day,
        today: r.today,
        freezeCrystals: r.freeze_crystals,
        freezesUsed: r.freezes_used ?? [],
        state: r.state,
        relightProgress: r.relight_progress,
        missions: r.missions ?? {},
      },
    })
  },

  // No Supabase quem conta é o banco (gatilhos); aqui só avisamos o scan e recarregamos.
  event: (kind, amount = 1, shiny = false) => {
    if (isDemo) {
      const next = touch(readDemo(), kind, amount, shiny, todaySP())
      writeDemo(next)
      return set({ status: toStatus(next) })
    }
    if (kind === 'scan') void supabase!.rpc('mascot_scan')
    window.clearTimeout(reloadTimer)
    reloadTimer = window.setTimeout(() => {
      void (async () => {
        const { data } = await supabase!.auth.getUser()
        await get().load(data.user?.id ?? null)
      })()
    }, 900)
  },
}))
