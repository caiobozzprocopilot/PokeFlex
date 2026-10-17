import { create } from 'zustand'
import type { CardVariant, PokemonCard } from '../types/pokemon'
import { isDemo, supabase } from '../lib/supabase'
import { useMascot } from './mascot'

export type WishItem = {
  id: string
  card: PokemonCard
  variant: CardVariant
  targetPrice?: number
  addedAt: string
}

type Row = {
  id: string
  card: PokemonCard
  variant: CardVariant
  target_price: number | string | null
  added_at: string
}

type WishlistState = {
  items: WishItem[]
  error: string | null
  load: (userId: string | null) => Promise<void>
  add: (card: PokemonCard, variant: CardVariant, targetPrice?: number) => Promise<void>
  remove: (id: string) => Promise<void>
  removeMany: (ids: string[]) => Promise<void>
  setTarget: (id: string, targetPrice: number | undefined) => Promise<void>
  dismissError: () => void
}

const COLUMNS = 'id, card, variant, target_price, added_at'
const DEMO_KEY = 'pokeflex-wishlist'

const fromRow = (r: Row): WishItem => ({
  id: r.id,
  card: r.card,
  variant: r.variant,
  targetPrice: r.target_price !== null ? Number(r.target_price) : undefined,
  addedAt: r.added_at,
})

const tempId = () => `tmp-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`

const readDemo = (): WishItem[] => {
  try {
    const list = JSON.parse(localStorage.getItem(DEMO_KEY) ?? '[]') as WishItem[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

const offline = (err: { message?: string } | null) => !!err?.message && /fetch|network/i.test(err.message)

export const useWishlist = create<WishlistState>()((set, get) => {
  const commit = (items: WishItem[]) => {
    set({ items })
    if (isDemo) {
      try {
        localStorage.setItem(DEMO_KEY, JSON.stringify(items))
      } catch {
        // Sem armazenamento: a lista vale só nesta visita.
      }
    }
  }
  const fail = (fallback: string, err: { message?: string } | null, restore: WishItem[]) => {
    commit(restore)
    set({ error: offline(err) ? 'Sem conexão com o servidor. Verifique sua internet.' : fallback })
  }

  return {
    items: [],
    error: null,

    load: async (userId) => {
      if (isDemo) return set({ items: readDemo(), error: null })
      if (!userId) return set({ items: [], error: null })
      const { data, error } = await supabase!.from('wishlist_items').select(COLUMNS).eq('user_id', userId).order('added_at', { ascending: false })
      if (error) return set({ error: 'Não foi possível carregar sua lista de desejos.' })
      set({ items: (data as Row[]).map(fromRow), error: null })
    },

    add: async (card, variant, targetPrice) => {
      if (get().items.some((i) => i.card.id === card.id && i.variant === variant)) return
      const before = get().items
      const optimistic: WishItem = { id: tempId(), card, variant, targetPrice, addedAt: new Date().toISOString() }
      commit([optimistic, ...before])
      const kind = targetPrice !== undefined ? 'wish_target' : 'wish'
      if (isDemo) return useMascot.getState().event(kind)
      const { data, error } = await supabase!
        .from('wishlist_items')
        .insert({ card_id: card.id, card, variant, target_price: targetPrice ?? null })
        .select(COLUMNS)
        .single()
      if (error) return fail('Não foi possível adicionar à lista de desejos.', error, before)
      commit(get().items.map((i) => (i.id === optimistic.id ? fromRow(data as Row) : i)))
      useMascot.getState().event(kind)
    },

    remove: async (id) => {
      const before = get().items
      commit(before.filter((i) => i.id !== id))
      if (isDemo || id.startsWith('tmp-')) return
      const { error } = await supabase!.from('wishlist_items').delete().eq('id', id)
      if (error) fail('Não foi possível remover da lista de desejos.', error, before)
    },

    removeMany: async (ids) => {
      if (!ids.length) return
      const before = get().items
      const drop = new Set(ids)
      commit(before.filter((i) => !drop.has(i.id)))
      const saved = ids.filter((id) => !id.startsWith('tmp-'))
      if (isDemo || !saved.length) return
      const { error } = await supabase!.from('wishlist_items').delete().in('id', saved)
      if (error) fail('Não foi possível remover os itens selecionados.', error, before)
    },

    setTarget: async (id, targetPrice) => {
      const before = get().items
      const kind = targetPrice !== undefined && before.find((i) => i.id === id)?.targetPrice === undefined ? 'wish_target' : 'wish'
      commit(before.map((i) => (i.id === id ? { ...i, targetPrice } : i)))
      if (isDemo || id.startsWith('tmp-')) return useMascot.getState().event(kind)
      const { error } = await supabase!
        .from('wishlist_items')
        .update({ target_price: targetPrice ?? null })
        .eq('id', id)
      if (error) return fail('Não foi possível salvar o preço-alvo.', error, before)
      useMascot.getState().event(kind)
    },

    dismissError: () => set({ error: null }),
  }
})
