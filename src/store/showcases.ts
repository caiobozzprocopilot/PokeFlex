import { create } from 'zustand'
import { isDemo, supabase } from '../lib/supabase'

export type ShowcaseStyle = 'cylinder' | 'orbit' | 'wheel'

export type Showcase = {
  id: string
  name: string
  cardIds: string[]
  style: ShowcaseStyle
  featured: boolean
}

export type ShowcaseDraft = Pick<Showcase, 'name' | 'cardIds' | 'style'>

type Row = { id: string; name: string; card_ids: string[]; style: ShowcaseStyle; is_featured: boolean }

type ShowcasesState = {
  items: Showcase[]
  load: (userId: string | null) => Promise<void>
  create: (draft: ShowcaseDraft) => Promise<Showcase>
  update: (id: string, draft: ShowcaseDraft) => Promise<void>
  remove: (id: string) => Promise<void>
  feature: (id: string) => Promise<void>
}

export const MAX_SHOWCASE_CARDS = 30
export const MIN_SHOWCASE_CARDS = 3

const COLUMNS = 'id, name, card_ids, style, is_featured'
const DEMO_KEY = 'pokeflex-showcases'

const fromRow = (r: Row): Showcase => ({ id: r.id, name: r.name, cardIds: r.card_ids, style: r.style, featured: r.is_featured })

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

const readDemo = (): Showcase[] => {
  try {
    const list = JSON.parse(localStorage.getItem(DEMO_KEY) ?? '[]') as Showcase[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

const failure = (fallback: string, message?: string) =>
  new Error(message && /fetch|network/i.test(message) ? 'Sem conexão com o servidor.' : fallback)

const validate = (draft: ShowcaseDraft) => {
  const name = draft.name.trim()
  if (!name) throw new Error('Dê um nome para a vitrine.')
  if (name.length > 40) throw new Error('Use até 40 caracteres no nome.')
  if (draft.cardIds.length < MIN_SHOWCASE_CARDS) throw new Error(`Escolha pelo menos ${MIN_SHOWCASE_CARDS} cartas.`)
  if (draft.cardIds.length > MAX_SHOWCASE_CARDS) throw new Error(`Uma vitrine pode ter até ${MAX_SHOWCASE_CARDS} cartas.`)
  return { ...draft, name }
}

export const useShowcases = create<ShowcasesState>()((set, get) => {
  const commit = (items: Showcase[]) => {
    set({ items })
    if (isDemo) {
      try {
        localStorage.setItem(DEMO_KEY, JSON.stringify(items))
      } catch {
        // Sem armazenamento: as vitrines valem só nesta visita.
      }
    }
  }

  return {
    items: [],

    load: async (userId) => {
      if (isDemo) return set({ items: readDemo() })
      if (!userId) return set({ items: [] })
      const { data } = await supabase!.from('showcases').select(COLUMNS).eq('user_id', userId).order('created_at', { ascending: true })
      set({ items: ((data as Row[] | null) ?? []).map(fromRow) })
    },

    create: async (draft) => {
      const clean = validate(draft)
      const first = get().items.length === 0
      if (isDemo) {
        const created: Showcase = { id: newId(), ...clean, featured: first }
        commit([...get().items, created])
        return created
      }
      const { data, error } = await supabase!
        .from('showcases')
        .insert({ name: clean.name, card_ids: clean.cardIds, style: clean.style, is_featured: first })
        .select(COLUMNS)
        .single()
      if (error) throw failure('Não foi possível criar a vitrine.', error.message)
      const created = fromRow(data as Row)
      commit([...get().items, created])
      return created
    },

    update: async (id, draft) => {
      const clean = validate(draft)
      const before = get().items
      commit(before.map((s) => (s.id === id ? { ...s, ...clean } : s)))
      if (isDemo) return
      const { error } = await supabase!
        .from('showcases')
        .update({ name: clean.name, card_ids: clean.cardIds, style: clean.style, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) {
        commit(before)
        throw failure('Não foi possível salvar a vitrine.', error.message)
      }
    },

    remove: async (id) => {
      const before = get().items
      const removed = before.find((s) => s.id === id)
      let next = before.filter((s) => s.id !== id)
      // Se a principal sair, a primeira restante assume o lugar.
      if (removed?.featured && next.length) next = next.map((s, i) => ({ ...s, featured: i === 0 }))
      commit(next)
      if (isDemo) return
      const { error } = await supabase!.from('showcases').delete().eq('id', id)
      if (error) {
        commit(before)
        throw failure('Não foi possível apagar a vitrine.', error.message)
      }
      if (removed?.featured && next.length) await supabase!.from('showcases').update({ is_featured: true }).eq('id', next[0].id)
    },

    feature: async (id) => {
      const before = get().items
      commit(before.map((s) => ({ ...s, featured: s.id === id })))
      if (isDemo) return
      // Primeiro desmarca a atual: o banco só aceita uma principal por usuário.
      const { error: clearError } = await supabase!.from('showcases').update({ is_featured: false }).eq('is_featured', true).neq('id', id)
      const { error } = clearError ? { error: clearError } : await supabase!.from('showcases').update({ is_featured: true }).eq('id', id)
      if (error) {
        commit(before)
        throw failure('Não foi possível trocar a vitrine principal.', error.message)
      }
    },
  }
})
