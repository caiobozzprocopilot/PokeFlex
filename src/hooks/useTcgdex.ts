import { fetchSetCards, fetchSets } from '../services/tcgdex'
import { fetchPricing, fetchRates } from '../services/pricing'
import { useResource } from './useResource'

export const useSets = () => useResource('sets', fetchSets)
export const useSetCards = (setId: string) => useResource(`set:${setId}`, () => fetchSetCards(setId))
export const usePricing = (cardId: string | null) =>
  useResource(cardId ? `price:${cardId}` : null, () => fetchPricing(cardId!))
export const useRates = () => useResource('rates', fetchRates)
