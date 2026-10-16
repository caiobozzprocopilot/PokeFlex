import type { PokemonCard } from '../types/pokemon'
import type { CollectionEntry } from '../store/collection'

// Uma carta conta para "completar o set" quando o número dela está dentro da numeração oficial
// (secret rares como 110/102 e promos com letras ficam de fora).
export const isMainSetCard = (card: PokemonCard) => {
  const [local, official] = card.number.split('/')
  const n = Number.parseInt(local, 10)
  const max = Number.parseInt(official, 10)
  return Number.isFinite(n) && Number.isFinite(max) && n >= 1 && n <= max
}

export type SetProgress = {
  setId: string
  name: string
  releaseDate?: string
  official: number
  owned: number
}

export function setsInProgress(entries: CollectionEntry[]): SetProgress[] {
  const bySet = new Map<string, SetProgress & { ids: Set<string> }>()
  for (const { card } of entries) {
    const official = Number.parseInt(card.number.split('/')[1], 10)
    if (!Number.isFinite(official) || official <= 0) continue
    const s = bySet.get(card.setId) ?? {
      setId: card.setId,
      name: card.series,
      releaseDate: card.releaseDate,
      official,
      owned: 0,
      ids: new Set<string>(),
    }
    if (isMainSetCard(card)) s.ids.add(card.id)
    bySet.set(card.setId, s)
  }
  return [...bySet.values()]
    .map(({ ids, ...s }) => ({ ...s, owned: ids.size }))
    .sort((a, b) => b.owned / b.official - a.owned / a.official || b.owned - a.owned)
}
