import { useEffect, useMemo, useRef, useState } from 'react'
import type { PokemonCard } from '../types/pokemon'
import { bestQuote, fetchPricing, toBRL } from '../services/pricing'
import { defaultVariant } from '../utils/collection'
import { useRates } from './useTcgdex'

const WORKERS = 6
const FLUSH_MS = 250

// Preço de referência em reais (NM, variante padrão) de cada carta da lista; null quando a tcgDex não tem preço.
// Só busca com enabled, pois uma lista grande custa uma consulta por carta (guardadas em cache por 12h).
export function useCardPrices(cards: PokemonCard[], enabled: boolean) {
  const rates = useRates()
  const [prices, setPrices] = useState<Record<string, number | null>>({})
  const known = useRef(prices)
  known.current = prices

  useEffect(() => {
    const r = rates.data
    if (!enabled || !r) return
    const todo = cards.filter((c) => !(c.id in known.current))
    if (todo.length === 0) return
    let cancelled = false
    let pending: Record<string, number | null> = {}
    const flush = () => {
      if (cancelled || Object.keys(pending).length === 0) return
      const batch = pending
      pending = {}
      setPrices((p) => ({ ...p, ...batch }))
    }
    const timer = setInterval(flush, FLUSH_MS)
    let next = 0
    const worker = async () => {
      while (!cancelled && next < todo.length) {
        const card = todo[next++]
        const pricing = await fetchPricing(card.id).catch(() => null)
        const q = bestQuote(pricing, card, defaultVariant(card))
        pending[card.id] = q ? toBRL(q, q.value, r) : null
      }
    }
    Promise.all(Array.from({ length: WORKERS }, worker)).then(() => {
      flush()
      clearInterval(timer)
    })
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [cards, enabled, rates.data])

  const loaded = useMemo(() => cards.filter((c) => c.id in prices).length, [cards, prices])
  return { prices, loaded, total: cards.length, loading: enabled && loaded < cards.length, error: rates.error }
}
