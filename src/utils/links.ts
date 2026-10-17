import type { PokemonCard } from '../types/pokemon'

// Página da carta na LigaPokemon. A Liga usa nome em inglês e o número como impresso ("4/102", "063/165"),
// o mesmo formato da tcgDex. Se não achar a carta exata, ela mesma cai numa busca por nome e número.
export function ligaPokemonUrl(card: Pick<PokemonCard, 'name' | 'number'>) {
  return `https://www.ligapokemon.com.br/?view=cards/card&card=${encodeURIComponent(`${card.name} (${card.number})`)}`
}
