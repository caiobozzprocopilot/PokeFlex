import { create } from 'zustand'
import { isDemo, supabase } from '../lib/supabase'

export type Snapshot = { day: string; total: number; cards: number }

type HistoryState = {
  snapshots: Snapshot[]
  loadedFor: string | null
  load: (userId: string | null) => Promise<void>
  record: (userId: string | null, total: number, cards: number) => Promise<void>
}

const DEMO_KEY = 'pokeflex-value-history'

// Data local (não UTC), para o "dia" bater com o calendário de quem usa.
export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const readDemo = (): Snapshot[] => {
  try {
    const list = JSON.parse(localStorage.getItem(DEMO_KEY) ?? '[]') as Snapshot[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

const upsertLocal = (list: Snapshot[], snap: Snapshot) =>
  [...list.filter((s) => s.day !== snap.day), snap].sort((a, b) => a.day.localeCompare(b.day))

export const useValueHistory = create<HistoryState>()((set, get) => ({
  snapshots: [],
  loadedFor: null,

  load: async (userId) => {
    if (isDemo) return set({ snapshots: readDemo(), loadedFor: 'demo' })
    if (!userId) return set({ snapshots: [], loadedFor: null })
    const { data, error } = await supabase!
      .from('collection_value_snapshots')
      .select('day, total_brl, cards')
      .order('day', { ascending: true })
      .limit(730)
    if (error) return set({ snapshots: [], loadedFor: userId })
    set({
      snapshots: (data as { day: string; total_brl: number | string; cards: number }[]).map((r) => ({
        day: r.day,
        total: Number(r.total_brl),
        cards: r.cards,
      })),
      loadedFor: userId,
    })
  },

  record: async (userId, total, cards) => {
    const snap = { day: today(), total: Math.round(total * 100) / 100, cards }
    const current = get().snapshots.find((s) => s.day === snap.day)
    if (current && current.total === snap.total && current.cards === snap.cards) return
    const next = upsertLocal(get().snapshots, snap)
    set({ snapshots: next })
    if (isDemo) {
      try {
        localStorage.setItem(DEMO_KEY, JSON.stringify(next))
      } catch {
        // Sem armazenamento: o histórico vale só nesta visita.
      }
      return
    }
    if (!userId) return
    await supabase!
      .from('collection_value_snapshots')
      .upsert(
        { day: snap.day, total_brl: snap.total, cards: snap.cards, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,day' },
      )
  },
}))
