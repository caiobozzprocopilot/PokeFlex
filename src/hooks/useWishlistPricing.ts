import { useEffect, useState } from 'react'
import type { WishItem } from '../store/wishlist'
import { fetchPricing, fetchRates, quote, toBRL, type PriceQuote } from '../services/pricing'
import { mapLimited } from './useCollectionValue'

export type PricedWish = { item: WishItem; quote: PriceQuote | null; price: number | null; belowTarget: boolean }

// Preço de referência (Near Mint) de cada desejo, em reais, e se já está abaixo do alvo.
export function useWishlistPricing(items: WishItem[]) {
  const [state, setState] = useState<{ loading: boolean; list: PricedWish[] }>({ loading: true, list: [] })
  const key = items.map((i) => `${i.id}:${i.variant}:${i.targetPrice ?? ''}`).join('|')

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true }))
    Promise.all([fetchRates(), mapLimited(items, 4, (i) => fetchPricing(i.card.id).catch(() => null))])
      .then(([rates, prices]) => {
        if (cancelled) return
        const list = items.map((item, idx) => {
          const q =
            quote(prices[idx], item.card, item.variant, 'cardmarket') ?? quote(prices[idx], item.card, item.variant, 'tcgplayer')
          const price = q ? toBRL(q, q.value, rates) : null
          return { item, quote: q, price, belowTarget: price !== null && !!item.targetPrice && price <= item.targetPrice }
        })
        setState({ loading: false, list })
      })
      .catch(
        () =>
          !cancelled &&
          setState({ loading: false, list: items.map((item) => ({ item, quote: null, price: null, belowTarget: false })) }),
      )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}
