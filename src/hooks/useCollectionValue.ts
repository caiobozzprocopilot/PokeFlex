import { useEffect, useState } from 'react'
import type { CollectionEntry } from '../store/collection'
import { bestQuote, conditionFactor, fetchPricing, fetchRates, toBRL, type CardPricing } from '../services/pricing'

type Value = { total: number; priced: number; missing: number; loading: boolean; error: boolean }

async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

export function useCollectionValue(entries: CollectionEntry[]): Value {
  const [state, setState] = useState<Value>({ total: 0, priced: 0, missing: 0, loading: true, error: false })
  const key = entries.map((e) => `${e.id}:${e.quantity}`).join('|')

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true }))
    const ids = [...new Set(entries.map((e) => e.card.id))]
    Promise.all([
      fetchRates(),
      mapLimited(ids, 4, (id) => fetchPricing(id).catch(() => null)),
    ])
      .then(([rates, prices]) => {
        if (cancelled) return
        const byId = new Map<string, CardPricing | null>(ids.map((id, i) => [id, prices[i]]))
        let total = 0
        let priced = 0
        let missing = 0
        for (const e of entries) {
          const q = bestQuote(byId.get(e.card.id) ?? null, e.card, e.variant)
          if (!q) {
            missing += e.quantity
            continue
          }
          total += toBRL(q, q.value, rates) * conditionFactor(e.condition) * e.quantity
          priced += e.quantity
        }
        setState({ total, priced, missing, loading: false, error: false })
      })
      .catch(() => !cancelled && setState({ total: 0, priced: 0, missing: 0, loading: false, error: true }))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}
