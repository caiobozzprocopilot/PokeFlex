import { useMemo } from 'react'
import { create } from 'zustand'
import type { CardVariant, PokemonCard } from '../types/pokemon'
import type { Condition } from '../services/pricing'
import { CARDS, OWNED } from '../data/mock'
import { isDemo, supabase } from '../lib/supabase'
import { pokedexName } from '../utils/achievements'
import { useFx } from './fx'
import { useMascot } from './mascot'

export type Language = 'pt' | 'en' | 'jp' | 'es' | 'outro'

export type Grading = { company: string; grade: number }

export type CollectionEntry = {
  id: string
  card: PokemonCard
  variant: CardVariant
  condition: Condition
  language: Language
  quantity: number
  graded?: Grading
  pricePaid?: number
  addedAt: string
}

export type NewEntry = Omit<CollectionEntry, 'id' | 'addedAt'>

type Status = 'idle' | 'loading' | 'ready' | 'error'

type CollectionState = {
  entries: CollectionEntry[]
  status: Status
  error: string | null
  load: (userId: string | null) => Promise<void>
  add: (entry: NewEntry) => Promise<void>
  remove: (id: string) => Promise<void>
  applyTrade: (give: TradeCard[], receive: TradeCard[]) => Promise<void>
  dismissError: () => void
}

type TradeCard = { card: PokemonCard; variant: CardVariant; quantity: number }

type Row = {
  id: string
  card: PokemonCard
  variant: CardVariant
  condition: Condition
  language: Language
  quantity: number
  graded_company: string | null
  graded_grade: number | string | null
  price_paid: number | string | null
  added_at: string
}

const COLUMNS = 'id, card, variant, condition, language, quantity, graded_company, graded_grade, price_paid, added_at'

const fromRow = (r: Row): CollectionEntry => ({
  id: r.id,
  card: r.card,
  variant: r.variant,
  condition: r.condition,
  language: r.language,
  quantity: r.quantity,
  graded: r.graded_company ? { company: r.graded_company, grade: Number(r.graded_grade) } : undefined,
  pricePaid: r.price_paid !== null ? Number(r.price_paid) : undefined,
  addedAt: r.added_at,
})

const toRow = (e: NewEntry) => ({
  card_id: e.card.id,
  card: e.card,
  variant: e.variant,
  condition: e.condition,
  language: e.language,
  quantity: e.quantity,
  graded_company: e.graded?.company ?? null,
  graded_grade: e.graded?.grade ?? null,
  price_paid: e.pricePaid ?? null,
})

const tempId = () => `tmp-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`

// Modo demonstração: mesma chave e formato usados antes, para não perder o que já estava salvo.
const DEMO_KEY = 'pokeflex-collection'
const DAY = 24 * 60 * 60 * 1000

const demoSeed = (): CollectionEntry[] =>
  CARDS.filter((c) => OWNED[c.id]).map((card, i) => ({
    id: `seed-${card.id}`,
    card,
    variant: card.holo ? 'holo' : 'normal',
    condition: 'NM',
    language: 'en',
    quantity: OWNED[card.id],
    addedAt: new Date(Date.now() - (i + 1) * DAY).toISOString(),
  }))

const readDemo = (): CollectionEntry[] => {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    const entries = raw ? (JSON.parse(raw) as { state?: { entries?: CollectionEntry[] } }).state?.entries : undefined
    return Array.isArray(entries) ? entries : demoSeed()
  } catch {
    return demoSeed()
  }
}

const writeDemo = (entries: CollectionEntry[]) => {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify({ state: { entries }, version: 1 }))
  } catch {
    // Sem armazenamento: a coleção vale só até recarregar.
  }
}

const message = (fallback: string, err: unknown) =>
  err && typeof err === 'object' && 'message' in err && /fetch|network/i.test(String(err.message))
    ? 'Sem conexão com o servidor. Verifique sua internet.'
    : fallback

export const useCollection = create<CollectionState>()((set, get) => {
  const commit = (entries: CollectionEntry[]) => {
    set({ entries })
    if (isDemo) writeDemo(entries)
  }

  return {
    entries: [],
    status: 'idle',
    error: null,

    load: async (userId) => {
      if (isDemo) return set({ entries: readDemo(), status: 'ready', error: null })
      if (!userId) return set({ entries: [], status: 'idle', error: null })
      set({ status: 'loading', error: null })
      const { data, error } = await supabase!
        .from('collection_entries')
        .select(COLUMNS)
        .eq('user_id', userId)
        .order('added_at', { ascending: false })
      if (error) return set({ status: 'error', error: message('Não foi possível carregar sua coleção.', error) })
      set({ entries: (data as Row[]).map(fromRow), status: 'ready' })
    },

    add: async (entry) => {
      const optimistic: CollectionEntry = { ...entry, id: tempId(), addedAt: new Date().toISOString() }
      const dex = pokedexName(entry.card.name)
      const newEntry =
        entry.card.category === 'pokemon' &&
        !get().entries.some((e) => e.card.category === 'pokemon' && pokedexName(e.card.name) === dex)
      commit([optimistic, ...get().entries])
      useFx.getState().catchCard(entry.card, newEntry)
      const shiny = entry.variant === 'holo' || entry.variant === 'reverse'
      if (isDemo) return useMascot.getState().event('card_add', entry.quantity, shiny)
      const { data, error } = await supabase!.from('collection_entries').insert(toRow(entry)).select(COLUMNS).single()
      if (error) {
        commit(get().entries.filter((e) => e.id !== optimistic.id))
        throw new Error(message('Não foi possível salvar a carta. Tente de novo.', error))
      }
      commit(get().entries.map((e) => (e.id === optimistic.id ? fromRow(data as Row) : e)))
      useMascot.getState().event('card_add', entry.quantity, shiny)
    },

    remove: async (id) => {
      const before = get().entries
      commit(before.filter((e) => e.id !== id))
      if (isDemo || id.startsWith('tmp-')) return useMascot.getState().event('card_remove')
      const { error } = await supabase!.from('collection_entries').delete().eq('id', id)
      if (error) {
        commit(before)
        set({ error: message('Não foi possível remover a carta. Tente de novo.', error) })
        return
      }
      useMascot.getState().event('card_remove')
    },

    // Troca concluída: tira as cópias entregues (primeiro da mesma variante) e adiciona as recebidas.
    applyTrade: async (give, receive) => {
      const before = get().entries
      const updates: { id: string; quantity: number }[] = []
      const deletes: string[] = []
      let entries = [...before]
      for (const g of give) {
        let left = g.quantity
        const candidates = entries
          .filter((e) => e.card.id === g.card.id)
          .sort((a, b) => Number(b.variant === g.variant) - Number(a.variant === g.variant))
        for (const e of candidates) {
          if (left <= 0) break
          if (e.quantity > left) {
            updates.push({ id: e.id, quantity: e.quantity - left })
            entries = entries.map((x) => (x.id === e.id ? { ...x, quantity: x.quantity - left } : x))
            left = 0
          } else {
            deletes.push(e.id)
            entries = entries.filter((x) => x.id !== e.id)
            left -= e.quantity
          }
        }
      }
      commit(entries)
      if (!isDemo) {
        const saved = deletes.filter((id) => !id.startsWith('tmp-'))
        const results = await Promise.all([
          ...updates.filter((u) => !u.id.startsWith('tmp-')).map((u) => supabase!.from('collection_entries').update({ quantity: u.quantity }).eq('id', u.id)),
          ...(saved.length ? [supabase!.from('collection_entries').delete().in('id', saved)] : []),
        ])
        if (results.some((r) => r.error)) {
          commit(before)
          throw new Error('Não foi possível atualizar a coleção. Tente de novo.')
        }
      }
      for (const r of receive) {
        await get().add({ card: r.card, variant: r.variant, condition: 'NM', language: 'pt', quantity: r.quantity })
      }
    },

    dismissError: () => set({ error: null }),
  }
})

export function useOwned() {
  const entries = useCollection((s) => s.entries)
  return useMemo(() => {
    const quantities: Record<string, number> = {}
    const cards = new Map<string, PokemonCard>()
    let total = 0
    for (const e of entries) {
      quantities[e.card.id] = (quantities[e.card.id] ?? 0) + e.quantity
      if (!cards.has(e.card.id)) cards.set(e.card.id, e.card)
      total += e.quantity
    }
    return { entries, quantities, cards: [...cards.values()], total, unique: cards.size }
  }, [entries])
}
