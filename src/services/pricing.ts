import type { CardVariant, PokemonCard } from '../types/pokemon'
import { cached } from './tcgdex'

const PRICE_TTL = 12 * 60 * 60 * 1000

export type Condition = 'MT' | 'NM' | 'EX' | 'GD' | 'LP' | 'PL' | 'PO'

// Escala do Cardmarket. O preço de referência é de cartas NM; os fatores são uma estimativa para as demais.
export const CONDITIONS: { id: Condition; label: string; hint: string; factor: number }[] = [
  { id: 'MT', label: 'Mint', hint: 'Perfeita, como saiu do pacote.', factor: 1.1 },
  { id: 'NM', label: 'Near Mint', hint: 'Quase perfeita, no máximo marcas mínimas.', factor: 1 },
  { id: 'EX', label: 'Excelente', hint: 'Pequenos desgastes nas bordas ou cantos.', factor: 0.85 },
  { id: 'GD', label: 'Boa', hint: 'Desgaste visível, sem dobras.', factor: 0.7 },
  { id: 'LP', label: 'Pouco jogada', hint: 'Riscos e bordas gastas de uso.', factor: 0.6 },
  { id: 'PL', label: 'Jogada', hint: 'Bastante uso, pode ter vincos leves.', factor: 0.45 },
  { id: 'PO', label: 'Danificada', hint: 'Dobras, rasgos ou manchas.', factor: 0.25 },
]

export const conditionFactor = (c: Condition) => CONDITIONS.find((x) => x.id === c)?.factor ?? 1

type CardmarketPrices = {
  updated?: string
  unit: 'EUR'
  avg?: number | null
  low?: number | null
  trend?: number | null
  avg1?: number | null
  avg7?: number | null
  avg30?: number | null
  'avg-holo'?: number | null
  'low-holo'?: number | null
  'trend-holo'?: number | null
  'avg7-holo'?: number | null
  'avg30-holo'?: number | null
}

type TcgPlayerVariant = {
  lowPrice?: number | null
  midPrice?: number | null
  highPrice?: number | null
  marketPrice?: number | null
}

export type CardPricing = {
  cardmarket?: CardmarketPrices
  tcgplayer?: { unit: 'USD'; updated?: string } & Record<string, TcgPlayerVariant | string | undefined>
}

export type Rates = { EUR: number; USD: number; date: string }

export type PriceSource = 'cardmarket' | 'tcgplayer'

export type PriceQuote = {
  source: PriceSource
  currency: 'EUR' | 'USD'
  value: number
  low?: number
  high?: number
  changePct?: number
  avg7?: number
  avg30?: number
  updated?: string
}

export function fetchPricing(cardId: string): Promise<CardPricing | null> {
  return cached(
    `price:${cardId}`,
    async () => {
      const res = await fetch(`https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(cardId)}`)
      if (!res.ok) throw new Error(`A tcgDex respondeu com erro ${res.status}.`)
      const json = (await res.json()) as { pricing?: CardPricing | null }
      return { pricing: json.pricing ?? null }
    },
    PRICE_TTL,
  ).then((r) => r.pricing)
}

export function fetchRates(): Promise<Rates> {
  return cached(
    'rates',
    async () => {
      const res = await fetch('https://api.frankfurter.dev/v1/latest?from=EUR&to=BRL,USD')
      if (!res.ok) throw new Error('Não foi possível obter a cotação do euro e do dólar.')
      const json = (await res.json()) as { date: string; rates: { BRL: number; USD: number } }
      return { EUR: json.rates.BRL, USD: json.rates.BRL / json.rates.USD, date: json.date }
    },
    PRICE_TTL,
  )
}

const num = (...values: (number | null | undefined)[]) => values.find((v): v is number => typeof v === 'number' && v > 0)

// Nos campos do Cardmarket, "-holo" é a versão brilhante de uma carta que também existe sem brilho.
function cardmarketQuote(cm: CardmarketPrices, card: PokemonCard, variant: CardVariant): PriceQuote | null {
  const shiny = variant === 'reverse' || (variant === 'holo' && card.variants.normal)
  const value = shiny ? num(cm['trend-holo'], cm['avg30-holo'], cm['avg-holo']) : num(cm.trend, cm.avg30, cm.avg)
  if (!value) return null
  const avg7 = shiny ? num(cm['avg7-holo']) : num(cm.avg7)
  const avg30 = shiny ? num(cm['avg30-holo']) : num(cm.avg30)
  return {
    source: 'cardmarket',
    currency: 'EUR',
    value,
    low: shiny ? num(cm['low-holo']) : num(cm.low),
    changePct: avg7 && avg30 ? ((avg7 - avg30) / avg30) * 100 : undefined,
    avg7,
    avg30,
    updated: cm.updated,
  }
}

const TCG_KEYS: Record<CardVariant, string[]> = {
  normal: ['normal', 'unlimited', 'unlimited-normal', 'unlimitedNormal'],
  holo: ['holofoil', 'unlimited-holofoil', 'unlimitedHolofoil'],
  reverse: ['reverse-holofoil', 'reverseHolofoil'],
  firstEdition: ['1st-edition-holofoil', '1stEditionHolofoil', '1st-edition-normal', '1stEditionNormal', '1st-edition'],
}

function tcgplayerQuote(tp: NonNullable<CardPricing['tcgplayer']>, variant: CardVariant): PriceQuote | null {
  const entries = Object.entries(tp).filter((e): e is [string, TcgPlayerVariant] => typeof e[1] === 'object' && !!e[1])
  const match = entries.find(([k]) => TCG_KEYS[variant].includes(k)) ?? (entries.length === 1 ? entries[0] : undefined)
  if (!match) return null
  const p = match[1]
  const value = num(p.marketPrice, p.midPrice, p.lowPrice)
  if (!value) return null
  return {
    source: 'tcgplayer',
    currency: 'USD',
    value,
    low: num(p.lowPrice),
    high: num(p.highPrice),
    updated: typeof tp.updated === 'string' ? tp.updated : undefined,
  }
}

export function quote(pricing: CardPricing | null, card: PokemonCard, variant: CardVariant, source: PriceSource) {
  if (!pricing) return null
  if (source === 'cardmarket') return pricing.cardmarket ? cardmarketQuote(pricing.cardmarket, card, variant) : null
  return pricing.tcgplayer ? tcgplayerQuote(pricing.tcgplayer, variant) : null
}

export function bestQuote(pricing: CardPricing | null, card: PokemonCard, variant: CardVariant) {
  return quote(pricing, card, variant, 'cardmarket') ?? quote(pricing, card, variant, 'tcgplayer')
}

export const toBRL = (q: Pick<PriceQuote, 'currency'>, value: number, rates: Rates) => value * rates[q.currency]

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const formatBRL = (v: number) => brl.format(v)
export const formatForeign = (v: number, currency: 'EUR' | 'USD') =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(v)
