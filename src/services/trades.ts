import type { CardVariant, PokemonCard } from '../types/pokemon'
import type { CollectionEntry } from '../store/collection'
import type { WishItem } from '../store/wishlist'
import { isDemo, supabase } from '../lib/supabase'
import { DEMO_TRAINERS, DEMO_WANTS, readJson, writeJson } from './social'

export type TradeStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed'
export type TradeAction = 'accept' | 'decline' | 'cancel' | 'complete' | 'applied'

export type TradeItem = { cardId: string; card: PokemonCard; variant: CardVariant; quantity: number }
export type MatchCard = { cardId: string; card: PokemonCard; variant: CardVariant; extra: number }
export type TrainerRef = { id: string; username: string | null; name: string; avatarUrl: string | null }

export type TradeMatch = { trainer: TrainerRef; theyHave: MatchCard[]; iHave: MatchCard[] }

export type Trade = {
  id: string
  status: TradeStatus
  outgoing: boolean
  // Do ponto de vista de quem está vendo: o que eu entrego e o que eu recebo.
  give: TradeItem[]
  receive: TradeItem[]
  message: string | null
  applied: boolean
  createdAt: string
  updatedAt: string
  other: TrainerRef
}

const failure = (fallback: string, message?: string) => {
  if (message && /fetch|network/i.test(message)) return new Error('Sem conexão com o servidor.')
  // Mensagens das funções do banco já vêm em português, prontas para mostrar.
  if (message && /[áéíóúãõç]|troca|carta|treinador/i.test(message)) return new Error(message)
  return new Error(fallback)
}

type RawItem = { card_id: string; card: PokemonCard; variant: CardVariant; quantity?: number; extra?: number }

const toItem = (i: RawItem): TradeItem => ({ cardId: i.card_id, card: i.card, variant: i.variant, quantity: Number(i.quantity ?? 1) })
const toMatch = (i: RawItem): MatchCard => ({ cardId: i.card_id, card: i.card, variant: i.variant, extra: Number(i.extra ?? 1) })
const toRaw = (i: TradeItem) => ({ card_id: i.cardId, variant: i.variant, quantity: i.quantity })

// Repetidas: cópias além da primeira de cada carta.
export function duplicates(entries: CollectionEntry[]): MatchCard[] {
  const by = new Map<string, MatchCard & { total: number; best: number }>()
  for (const e of entries) {
    const m = by.get(e.card.id)
    if (m) {
      m.total += e.quantity
      if (e.quantity > m.best) {
        m.best = e.quantity
        m.variant = e.variant
      }
    } else by.set(e.card.id, { cardId: e.card.id, card: e.card, variant: e.variant, extra: 0, total: e.quantity, best: e.quantity })
  }
  return [...by.values()].filter((m) => m.total > 1).map(({ total, best: _best, ...m }) => ({ ...m, extra: total - 1 }))
}

// ---------- Demonstração ----------

const DEMO_KEY = 'pokeflex-trades'
const DEMO_REPLY_MS = 4000

type DemoTrade = Omit<Trade, 'other' | 'outgoing'> & { otherId: string }

const demoRef = (id: string): TrainerRef => {
  const t = DEMO_TRAINERS.find((x) => x.id === id)!
  return { id: t.id, username: t.username, name: t.name, avatarUrl: t.avatarUrl }
}

// Na demonstração, o outro treinador aceita a proposta sozinho depois de alguns segundos.
const readDemo = (): DemoTrade[] =>
  readJson<DemoTrade[]>(DEMO_KEY, []).map((t) =>
    t.status === 'pending' && Date.now() - new Date(t.createdAt).getTime() > DEMO_REPLY_MS
      ? { ...t, status: 'accepted', updatedAt: new Date(new Date(t.createdAt).getTime() + DEMO_REPLY_MS).toISOString() }
      : t,
  )

// ---------- API ----------

export async function fetchMatches(own: CollectionEntry[], wishes: WishItem[]): Promise<TradeMatch[]> {
  if (isDemo) {
    const mine = duplicates(own)
    const wanted = new Set(wishes.map((w) => w.card.id))
    return DEMO_TRAINERS.map((t) => ({
      trainer: demoRef(t.id),
      theyHave: duplicates(t.entries).filter((d) => wanted.has(d.cardId)),
      iHave: mine.filter((d) => DEMO_WANTS[t.id]?.includes(d.cardId)),
    })).filter((m) => m.theyHave.length + m.iHave.length > 0)
  }
  const { data, error } = await supabase!.rpc('trade_matches')
  if (error) throw failure('Não foi possível buscar trocas possíveis.', error.message)
  return ((data ?? []) as { id: string; username: string; name: string; avatar_url: string | null; they_have: RawItem[]; i_have: RawItem[] }[]).map(
    (r) => ({
      trainer: { id: r.id, username: r.username, name: r.name, avatarUrl: r.avatar_url },
      theyHave: r.they_have.map(toMatch),
      iHave: r.i_have.map(toMatch),
    }),
  )
}

export async function fetchTrades(): Promise<Trade[]> {
  if (isDemo) {
    return readDemo()
      .map(({ otherId, ...t }) => ({ ...t, outgoing: true, other: demoRef(otherId) }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
  const { data, error } = await supabase!.rpc('my_trades')
  if (error) throw failure('Não foi possível carregar suas trocas.', error.message)
  type Row = {
    id: string
    status: TradeStatus
    outgoing: boolean
    offer: RawItem[]
    request: RawItem[]
    message: string | null
    applied: boolean
    created_at: string
    updated_at: string
    other_id: string
    other_username: string | null
    other_name: string
    other_avatar: string | null
  }
  return ((data ?? []) as Row[]).map((r) => {
    const offer = r.offer.map(toItem)
    const request = r.request.map(toItem)
    return {
      id: r.id,
      status: r.status,
      outgoing: r.outgoing,
      give: r.outgoing ? offer : request,
      receive: r.outgoing ? request : offer,
      message: r.message,
      applied: r.applied,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      other: { id: r.other_id, username: r.other_username, name: r.other_name, avatarUrl: r.other_avatar },
    }
  })
}

export async function proposeTrade(toId: string, give: TradeItem[], receive: TradeItem[], message: string) {
  if (give.length + receive.length === 0) throw new Error('Escolha pelo menos uma carta.')
  if (message.length > 280) throw new Error('A mensagem pode ter até 280 caracteres.')
  if (isDemo) {
    const now = new Date().toISOString()
    const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
    writeJson(DEMO_KEY, [
      ...readJson<DemoTrade[]>(DEMO_KEY, []),
      { id, status: 'pending', give, receive, message: message.trim() || null, applied: false, createdAt: now, updatedAt: now, otherId: toId },
    ])
    return id
  }
  const { data, error } = await supabase!.rpc('propose_trade', {
    p_to: toId,
    p_offer: give.map(toRaw),
    p_request: receive.map(toRaw),
    p_message: message.trim() || null,
  })
  if (error) throw failure('Não foi possível enviar a proposta.', error.message)
  return data as string
}

export async function respondTrade(id: string, action: TradeAction) {
  if (isDemo) {
    const next: Record<TradeAction, (t: DemoTrade) => Partial<DemoTrade>> = {
      accept: () => ({ status: 'accepted' }),
      decline: () => ({ status: 'declined' }),
      cancel: () => ({ status: 'cancelled' }),
      complete: () => ({ status: 'completed' }),
      applied: () => ({ applied: true }),
    }
    writeJson(
      DEMO_KEY,
      readDemo().map((t) => (t.id === id ? { ...t, ...next[action](t), updatedAt: new Date().toISOString() } : t)),
    )
    return
  }
  const { error } = await supabase!.rpc('respond_trade', { p_id: id, p_action: action })
  if (error) throw failure('Não foi possível atualizar a troca.', error.message)
}
