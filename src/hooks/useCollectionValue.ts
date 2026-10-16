import { useEffect, useState } from 'react'
import type { CollectionEntry } from '../store/collection'
import {
  bestQuote,
  conditionFactor,
  fetchPricing,
  fetchRates,
  toBRL,
  type CardPricing,
  type PriceQuote,
  type Rates,
} from '../services/pricing'

export async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

export type ValuedEntry = {
  entry: CollectionEntry
  quote: PriceQuote | null
  // Valores em reais, já ajustados pela condição.
  unit: number | null
  total: number | null
  avg7Total: number | null
  avg30Total: number | null
}

export type CollectionPricing = {
  loading: boolean
  error: boolean
  items: ValuedEntry[]
  total: number
  priced: number
  missing: number
  // Comparação do mês: média de 7 dias vs. 30 dias, só nas cópias que têm as duas.
  monthNow: number
  monthAvg30: number
  paid: number
  paidNow: number
}

const EMPTY: CollectionPricing = {
  loading: true,
  error: false,
  items: [],
  total: 0,
  priced: 0,
  missing: 0,
  monthNow: 0,
  monthAvg30: 0,
  paid: 0,
  paidNow: 0,
}

export function valueEntry(entry: CollectionEntry, pricing: CardPricing | null, rates: Rates): ValuedEntry {
  const quote = bestQuote(pricing, entry.card, entry.variant)
  if (!quote) return { entry, quote, unit: null, total: null, avg7Total: null, avg30Total: null }
  const factor = conditionFactor(entry.condition)
  const unit = toBRL(quote, quote.value, rates) * factor
  const scaled = (v?: number) => (v ? toBRL(quote, v, rates) * factor * entry.quantity : null)
  return { entry, quote, unit, total: unit * entry.quantity, avg7Total: scaled(quote.avg7), avg30Total: scaled(quote.avg30) }
}

export function useCollectionPricing(entries: CollectionEntry[]): CollectionPricing {
  const [state, setState] = useState<CollectionPricing>(EMPTY)
  const key = entries.map((e) => `${e.id}:${e.quantity}:${e.condition}:${e.variant}`).join('|')

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true }))
    const ids = [...new Set(entries.map((e) => e.card.id))]
    Promise.all([fetchRates(), mapLimited(ids, 4, (id) => fetchPricing(id).catch(() => null))])
      .then(([rates, prices]) => {
        if (cancelled) return
        const byId = new Map<string, CardPricing | null>(ids.map((id, i) => [id, prices[i]]))
        const items = entries.map((e) => valueEntry(e, byId.get(e.card.id) ?? null, rates))
        const next: CollectionPricing = { ...EMPTY, loading: false, items }
        for (const it of items) {
          const qty = it.entry.quantity
          if (it.total === null) {
            next.missing += qty
            continue
          }
          next.total += it.total
          next.priced += qty
          if (it.avg7Total !== null && it.avg30Total !== null) {
            next.monthNow += it.avg7Total
            next.monthAvg30 += it.avg30Total
          }
          if (it.entry.pricePaid) {
            next.paid += it.entry.pricePaid * qty
            next.paidNow += it.total
          }
        }
        setState(next)
      })
      .catch(() => !cancelled && setState({ ...EMPTY, loading: false, error: true }))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}

export function useCollectionValue(entries: CollectionEntry[]) {
  const { total, priced, missing, loading, error } = useCollectionPricing(entries)
  return { total, priced, missing, loading, error }
}
