import { create } from 'zustand'
import type { PokemonCard } from '../types/pokemon'
import type { Badge, Tier } from '../utils/achievements'

export type Celebration =
  | { kind: 'badge'; key: string; badge: Badge; tier: Tier }
  | { kind: 'level'; key: string; level: number; title: string }

export type Gotcha = { key: string; card: PokemonCard; newEntry: boolean }

type FxState = {
  queue: Celebration[]
  gotcha: Gotcha | null
  celebrate: (items: Celebration[]) => void
  next: () => void
  catchCard: (card: PokemonCard, newEntry: boolean) => void
  clearGotcha: (key: string) => void
}

export const useFx = create<FxState>()((set) => ({
  queue: [],
  gotcha: null,
  celebrate: (items) => set((s) => ({ queue: [...s.queue, ...items] })),
  next: () => set((s) => ({ queue: s.queue.slice(1) })),
  catchCard: (card, newEntry) => set({ gotcha: { key: `${card.id}-${Date.now()}`, card, newEntry } }),
  clearGotcha: (key) => set((s) => (s.gotcha?.key === key ? { gotcha: null } : s)),
}))
